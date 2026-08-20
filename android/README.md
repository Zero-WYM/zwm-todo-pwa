# Zero望月明工作台 · 安卓工程

本目录是一个**最小可用**的 Android Gradle 工程骨架，用 `WebView` 加载改造版 `index.html`
（`../index.html`，已复制到 `app/src/main/assets/index.html`），把「单文件待办」封装成可安装的安卓 App。

- 显示名：`Zero望月明工作台`
- 包名：`com.zerowangyueming.todoapp`
- 版本：`1.2`（versionCode 2）

> ⚠️ 沙箱内**未编译** APK（无 JDK/SDK/网络）。请在自有 Windows PC 上按下方步骤出包。

## 一、准备环境（仅首次）

1. 安装 **Android Studio**（官方包自带 JDK + Android SDK）。
   首次打开会下载 SDK 组件，需联网。
2. 手机开启调试：
   - 「设置 → 关于手机 → 版本号」连点 7 次开启**开发者选项**；
   - 开发者选项里打开 **USB 调试** 与 **未知来源 / 安装未知应用**（允许本 App 安装）。
3. USB 连电脑，手机选「传输文件 (MTP)」并在弹窗点「允许调试」。

## 二、出包（Debug）

方式 A（推荐，双击即可）：
- 在 `android/` 目录双击 **`build-apk.bat`**。
- 首次运行会自动下载 Gradle 8.2 及依赖（需联网，可能耗时数分钟）。
- 成功后 APK 位于：`app\build\outputs\apk\debug\app-debug.apk`。

方式 B（命令行）：
```bat
gradlew.bat assembleDebug
```

> 说明：`gradlew` / `gradlew.bat` 已就位，但 `gradle/wrapper/gradle-wrapper.jar`
> 二进制未在源码中包含。**首次用 Android Studio 打开本工程并 Sync 时**，Studio 会自动生成该 jar；
> 若想直接用 `gradlew.bat` 而不开 Studio，请先在有 Gradle 的环境执行 `gradle wrapper`
> 生成 `gradle-wrapper.jar`，或用 Android Studio 打开后改用其内置 Gradle。

## 三、安装到手机

- 用 Android Studio 直接 **Run**（手机已连接调试）即可安装运行；
- 或命令行：`adb install app\build\outputs\apk\debug\app-debug.apk`；
- 或把 `app-debug.apk` 传到手机，在「文件管理」里点开，允许未知来源安装。

> Debug 构建使用 Android 自动生成的 debug keystore，无需手动签名。

## 四、发布签名版（Release，可选）

1. 在工程目录执行（按提示填信息）：
   ```bat
   keytool -genkey -v -keystore release.keystore -alias zwm -keyalg RSA -keysize 2048 -validity 10000
   ```
2. 在 `app/build.gradle` 的 `buildTypes.release` 中取消 `signingConfigs` 注释并填入路径/别名/密码
   （示例已写在文件内）。
3. 执行：`gradlew.bat assembleRelease`
   产物：`app\build\outputs\apk\release/app-release.apk`。

## 五、关键实现点

- `MainActivity` 已 `setDomStorageEnabled(true)`：否则 HTML 的 `localStorage` 存不住，
  待办数据会丢失（红线项）。
- `WebChromeClient.onShowFileChooser` 桥接了「导入 JSON」：用 `registerForActivityResult`
  调起系统文件选择器，把返回的 `Uri` 回传给 WebView 的 `ValueCallback`。
- `addJavascriptInterface(..., "AndroidBridge")` 让改造版 `index.html` 能识别原生环境
  （`window.AndroidBridge` 存在 → 加 `native` 类、通知降级为应用内 toast）。
- 入口 `file:///android_asset/index.html`： Assets 内的页面无网络也能离线运行。

## 六、目录结构

```
android/
├── build.gradle                 # Project 级
├── settings.gradle
├── gradle.properties
├── gradlew / gradlew.bat        # Gradle wrapper 脚本
├── build-apk.bat                # 一键出包（Windows）
├── gradle/wrapper/gradle-wrapper.properties
├── app/
│   ├── build.gradle
│   └── src/main/
│       ├── AndroidManifest.xml
│       ├── java/com/zerowangyueming/todoapp/MainActivity.java
│       ├── res/
│       │   ├── layout/activity_main.xml
│       │   ├── values/{strings,colors,themes}.xml
│       │   ├── drawable/ic_launcher_{background,foreground}.xml
│       │   ├── mipmap-anydpi-v26/ic_launcher.xml   # 自适应图标(API26+)
│       │   └── mipmap-{h,m,xh,xxh,xxxh}dpi/ic_launcher.png  # 旧机型兜底
│       └── assets/index.html    # 改造版待办 App
```
