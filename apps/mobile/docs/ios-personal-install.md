# iPhone / iPad 自用安装与测试

`ios-simulator` 生成模拟器应用，不能直接装到实体设备。
`ios-unsigned` 为真实 iPhone / iPad 编译，生成未签名的
`BiliMusic-unsigned.ipa`；云端构建不需要 Apple 签名凭据。

自用构建默认关闭 Firebase 统计及其原生初始化，避免使用仓库中的占位配置。
以后如需启用，须先配置自己的有效 Firebase 文件，再设置 `ENABLE_FIREBASE=true`。

## 重新构建

在 `apps/mobile` 目录运行：

```powershell
npx.cmd eas-cli@latest build --platform ios --profile ios-unsigned
```

只有 Expo 构建页面显示成功、并出现 IPA 下载链接时，才有可交付安装包。

## Windows 签名安装

1. 从成功的 Expo 构建页面下载未签名 IPA。
2. 从官方网站 <https://sideloadly.io/> 安装 Sideloadly。
3. 用数据线连接 iPhone / iPad，在设备上选择信任这台电脑。
4. 在 Sideloadly 中选择设备和 IPA，使用你自己的 Apple 账号签名安装。
5. 按系统提示开启开发者模式、信任开发者描述文件，然后打开应用。

免费账号签名通常 7 天到期，需要刷新签名。Apple 密码和签名凭据应由你在
签名工具中输入，无需发送到聊天或提交到 Git。未签名 IPA 无法仅靠点击网页
下载链接完成安装，也不能使用 Expo Go 打开。

## 首次真机验证

1. 启动应用，完成引导，进入游客模式。
2. 搜索一条已知可访问的公开视频并播放。
3. 打开完整播放器，验证暂停、继续和拖动进度。
4. 验证队列切歌，然后锁屏检查是否持续播放。
5. 检查锁屏封面、歌曲信息、播放控制和来电等音频中断后的表现。
6. 在 iPad 上检查布局；当前应用配置固定为竖屏。

这些功能需要实际运行验证。编译成功并不能证明播放、后台音频、登录或
iPad 布局正常。若启动后退出，请提供设备型号、系统版本、触发步骤及错误信息。

启动测试脚本位于 `.maestro/ios-smoke.yaml`。当前 Expo 账号无法运行付费的
托管 Maestro 测试，脚本尚未执行；也可在有 Mac 模拟器的环境中运行。
