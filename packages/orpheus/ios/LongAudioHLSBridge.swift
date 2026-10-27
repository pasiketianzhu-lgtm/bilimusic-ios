import Foundation
import Network

/// Presents an indexed fragmented MP4 as HLS without transcoding or downloading
/// the entire file. The HTTP listener is restricted to the device loopback.
final class LongAudioHLSBridge {
    static let shared = LongAudioHLSBridge()

    private struct Segment {
        let offset: Int
        let size: Int
        let duration: Double
    }

    private struct Stream {
        let source: URL
        let initialization: Data
        let segments: [Segment]
        let playlist: Data
    }

    private let queue = DispatchQueue(label: "com.orpheus.hls.loopback")
    private let session = URLSession(configuration: .ephemeral)
    private var listener: NWListener?
    private var port: UInt16?
    private var waiters: [(Result<UInt16, Error>) -> Void] = []
    private var streams: [String: Stream] = [:]
    private var streamOrder: [String] = []

    private func failure(_ message: String) -> NSError {
        NSError(domain: "OrpheusHLS", code: 1,
                userInfo: [NSLocalizedDescriptionKey: message])
    }

    func prepare(source: URL, completion: @escaping (Result<URL, Error>) -> Void) {
        // A maximum-size flat sidx has 65,535 references (< 800 KiB).
        fetch(source: source, offset: 0, size: 1_048_576) { result in
            do {
                let stream = try self.parse(source: source, data: result.get())
                self.queue.async {
                    self.start { result in
                        switch result {
                        case .success(let port):
                            let token = UUID().uuidString
                            self.streams[token] = stream
                            self.streamOrder.append(token)
                            if self.streamOrder.count > 8 {
                                self.streams.removeValue(forKey: self.streamOrder.removeFirst())
                            }
                            let url = URL(string: "http://127.0.0.1:\(port)/\(token)/index.m3u8")!
                            completion(.success(url))
                        case .failure(let error): completion(.failure(error))
                        }
                    }
                }
            } catch {
                completion(.failure(error))
            }
        }
    }

    private func fetch(source: URL, offset: Int, size: Int,
                       completion: @escaping (Result<Data, Error>) -> Void) {
        var request = URLRequest(url: source, timeoutInterval: 25)
        request.setValue("bytes=\(offset)-\(offset + size - 1)", forHTTPHeaderField: "Range")
        request.setValue("https://www.bilibili.com/", forHTTPHeaderField: "Referer")
        request.setValue("Mozilla/5.0", forHTTPHeaderField: "User-Agent")
        session.dataTask(with: request) { data, response, error in
            if let error = error { completion(.failure(error)); return }
            guard let http = response as? HTTPURLResponse,
                  http.statusCode == 206, let data = data, !data.isEmpty,
                  data.count <= size,
                  http.value(forHTTPHeaderField: "Content-Range")?.hasPrefix("bytes \(offset)-") == true else {
                completion(.failure(self.failure("Audio server did not return the requested byte range")))
                return
            }
            completion(.success(data))
        }.resume()
    }

    private func parse(source: URL, data: Data) throws -> Stream {
        func uint32(_ offset: Int) throws -> Int {
            guard offset >= 0, offset + 4 <= data.count else {
                throw failure("Incomplete MP4 segment index")
            }
            return (0..<4).reduce(0) { ($0 << 8) | Int(data[offset + $1]) }
        }
        var offset = 0
        while offset + 8 <= data.count {
            let size = try uint32(offset)
            guard size >= 8, size <= data.count - offset else {
                throw failure("Unsupported MP4 index layout")
            }
            if String(data: data.subdata(in: offset + 4..<offset + 8), encoding: .ascii) == "sidx" {
                guard size >= 32 else { throw failure("Invalid MP4 index") }
                let version = data[offset + 8]
                guard version <= 1 else { throw failure("Unsupported MP4 index version") }
                let timescale = try uint32(offset + 16)
                let countOffset = offset + (version == 0 ? 30 : 38)
                guard timescale > 0, countOffset + 2 <= offset + size else {
                    throw failure("Invalid MP4 index timing")
                }
                let firstOffset: Int
                if version == 0 {
                    firstOffset = try uint32(offset + 24)
                } else {
                    let high = try uint32(offset + 28)
                    guard high == 0 else { throw failure("MP4 index offset is too large") }
                    firstOffset = try uint32(offset + 32)
                }
                let count = Int(data[countOffset]) << 8 | Int(data[countOffset + 1])
                guard count > 0, countOffset + 2 + count * 12 <= offset + size else {
                    throw failure("Incomplete MP4 segment references")
                }
                var cursor = offset + size + firstOffset
                var segments: [Segment] = []
                for index in 0..<count {
                    let entry = countOffset + 2 + index * 12
                    let reference = try uint32(entry)
                    let duration = Double(try uint32(entry + 4)) / Double(timescale)
                    guard reference & 0x80000000 == 0, reference > 0, duration > 0 else {
                        throw failure("Unsupported nested MP4 index")
                    }
                    segments.append(Segment(offset: cursor, size: reference, duration: duration))
                    cursor += reference
                }
                let targetDuration = Int(ceil(segments.map { $0.duration }.max()!))
                var lines = ["#EXTM3U", "#EXT-X-VERSION:7", "#EXT-X-PLAYLIST-TYPE:VOD",
                             "#EXT-X-TARGETDURATION:\(targetDuration)", "#EXT-X-MEDIA-SEQUENCE:0",
                             "#EXT-X-MAP:URI=\"init.mp4\""]
                for (index, segment) in segments.enumerated() {
                    lines.append(String(format: "#EXTINF:%.6f,", locale: Locale(identifier: "en_US_POSIX"), segment.duration))
                    lines.append("\(index).m4s")
                }
                lines.append("#EXT-X-ENDLIST")
                return Stream(source: source, initialization: data.subdata(in: 0..<offset),
                              segments: segments, playlist: Data((lines.joined(separator: "\n") + "\n").utf8))
            }
            offset += size
        }
        throw failure("MP4 audio has no supported segment index")
    }

    private func start(completion: @escaping (Result<UInt16, Error>) -> Void) {
        if let port = port { completion(.success(port)); return }
        waiters.append(completion)
        guard listener == nil else { return }
        do {
            let parameters = NWParameters.tcp
            parameters.requiredLocalEndpoint = .hostPort(host: "127.0.0.1", port: .any)
            let listener = try NWListener(using: parameters)
            self.listener = listener
            listener.newConnectionHandler = { connection in
                connection.start(queue: self.queue)
                self.receive(connection, request: Data())
            }
            listener.stateUpdateHandler = { state in
                switch state {
                case .ready:
                    guard let port = listener.port?.rawValue else { return }
                    self.port = port
                    let callbacks = self.waiters
                    self.waiters.removeAll()
                    callbacks.forEach { $0(.success(port)) }
                case .failed(let error):
                    self.listener = nil
                    self.port = nil
                    listener.cancel()
                    let callbacks = self.waiters
                    self.waiters.removeAll()
                    callbacks.forEach { $0(.failure(error)) }
                default: break
                }
            }
            listener.start(queue: queue)
        } catch {
            let callbacks = waiters
            waiters.removeAll()
            callbacks.forEach { $0(.failure(error)) }
        }
    }

    private func receive(_ connection: NWConnection, request: Data) {
        connection.receive(minimumIncompleteLength: 1, maximumLength: 8192) { data, _, complete, error in
            var request = request
            if let data = data { request.append(data) }
            if request.count > 16384 || error != nil { connection.cancel(); return }
            if let text = String(data: request, encoding: .utf8), text.contains("\r\n\r\n") {
                let firstLine = text.components(separatedBy: "\r\n")[0].split(separator: " ")
                guard firstLine.count >= 2, firstLine[0] == "GET" else {
                    self.send(connection, status: 405, content: Data(), mime: "text/plain"); return
                }
                self.serve(connection, path: String(firstLine[1]))
            } else if !complete {
                self.receive(connection, request: request)
            } else { connection.cancel() }
        }
    }

    private func serve(_ connection: NWConnection, path: String) {
        let parts = path.split(separator: "/")
        guard parts.count == 2, let stream = streams[String(parts[0])] else {
            send(connection, status: 404, content: Data(), mime: "text/plain"); return
        }
        let file = String(parts[1])
        if file == "index.m3u8" {
            send(connection, status: 200, content: stream.playlist, mime: "application/vnd.apple.mpegurl")
        } else if file == "init.mp4" {
            send(connection, status: 200, content: stream.initialization, mime: "audio/mp4")
        } else if file.hasSuffix(".m4s"), let index = Int(file.dropLast(4)), stream.segments.indices.contains(index) {
            let segment = stream.segments[index]
            fetch(source: stream.source, offset: segment.offset, size: segment.size) { result in
                self.queue.async {
                    switch result {
                    case .success(let data) where data.count == segment.size:
                        self.send(connection, status: 200, content: data, mime: "audio/mp4")
                    default:
                        self.send(connection, status: 502, content: Data(), mime: "text/plain")
                    }
                }
            }
        } else { send(connection, status: 404, content: Data(), mime: "text/plain") }
    }

    private func send(_ connection: NWConnection, status: Int, content: Data, mime: String) {
        let reason = status == 200 ? "OK" : "Error"
        let header = "HTTP/1.1 \(status) \(reason)\r\nContent-Type: \(mime)\r\nContent-Length: \(content.count)\r\nConnection: close\r\n\r\n"
        var response = Data(header.utf8)
        response.append(content)
        connection.send(content: response, completion: .contentProcessed { _ in connection.cancel() })
    }
}
