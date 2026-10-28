import Foundation

// Only the Record values and persistence boundary are stand-ins. Queue logic
// comes from the production source compiled alongside this executable.
struct Track { var id: String; var duration: Double? }
enum RepeatMode { case off, track, queue }
final class GeneralStorage {
    static let shared = GeneralStorage()
    var overrides: [String: Bool] = [:]
    func participatesInRandom(_ track: Track) -> Bool {
        return overrides[track.id] ?? ((track.duration ?? 0) <= 1800)
    }
}

@main
struct QueuePolicySmoke {
    static func main() {
        let tracks = [Track(id: "a", duration: 180), Track(id: "b", duration: 240), Track(id: "long", duration: 1801)]
        let queue = OrpheusQueueManager()
        queue.setQueue(tracks, startFromIndex: 0, inputShuffleMode: false)
        queue.skipTo(backingIndex: 0)
        queue.setShuffleMode(true)
        for _ in 0..<100 {
            let previous = queue.getCurrentTrack()!.id
            let index = queue.getNextIndex(repeatMode: .queue)!
            precondition(tracks[index].id != previous, "Random must not immediately repeat")
            precondition(tracks[index].id != "long", "Long content is excluded")
            queue.skipTo(backingIndex: index)
        }
        let previous = queue.getPreviousIndex(repeatMode: .queue)!
        precondition(tracks[previous].id != queue.getCurrentTrack()!.id, "Previous returns listening history")
        queue.prepareBackwardNavigation()
        queue.skipTo(backingIndex: previous)

        queue.setShuffleMode(false)
        for index in [0, 1, 2, 1, 0, 1] { queue.skipTo(backingIndex: index) }
        queue.setShuffleMode(true)
        precondition(queue.getNextIndex(repeatMode: .off) != nil, "Entering random resets its traversal budget")

        GeneralStorage.shared.overrides["long"] = true
        queue.setQueue([tracks[0], tracks[2]], startFromIndex: 0, inputShuffleMode: true)
        precondition(queue.getNextIndex(repeatMode: .queue) == 1, "Per-track opt-in overrides long default")
        GeneralStorage.shared.overrides.removeAll()

        queue.setQueue(tracks, startFromIndex: 0, inputShuffleMode: false)
        precondition(queue.reverseRemainingQueue())
        precondition(queue.getQueue().map(\.id) == ["a", "long", "b"], "Reverse preserves current")
        precondition(queue.moveTrack(fromIndex: 0, toIndex: 2))
        precondition(queue.getCurrentTrack()?.id == "a", "Move preserves active identity")

        queue.clear()
        queue.append(tracks: [tracks[0]])
        precondition(queue.getCurrentTrack()?.id == "a", "Append to empty queue prepares playback")
        queue.setShuffleMode(true)
        precondition(queue.getNextIndex(repeatMode: .queue) == nil, "Single eligible item cannot immediately repeat")

        queue.setQueue(tracks, startFromIndex: 0, inputShuffleMode: true)
        queue.insertNext(track: Track(id: "inserted", duration: 10))
        precondition(queue.moveTrack(fromIndex: 1, toIndex: 3))
        precondition(queue.getNextIndex(repeatMode: .queue) == 3, "Insertion follows stable identity after reorder")
        _ = queue.removeTrack(at: 3)
        precondition(queue.getNextIndex(repeatMode: .queue) == 1, "Deleted insertion cannot target another item")
        queue.clear()
        precondition(queue.getNextIndex(repeatMode: .queue) == nil)
        print("iOS production queue smoke tests passed")
    }
}
