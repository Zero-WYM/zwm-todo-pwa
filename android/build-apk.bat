@echo off
echo ============================================
echo  Zero望月明工作台 · 构建 Debug APK
echo ============================================
echo 首次运行会自动下载 Gradle 及依赖，请保持联网。
echo.
call gradlew.bat assembleDebug
echo.
echo APK 已生成：app\build\outputs\apk\debug\app-debug.apk
echo 安装方式见 README.md（adb install 或 Android Studio Run）。
pause
