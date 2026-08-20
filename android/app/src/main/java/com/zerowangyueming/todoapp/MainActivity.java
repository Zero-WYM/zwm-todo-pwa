package com.zerowangyueming.todoapp;

import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebChromeClient.FileChooserParams;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Zero望月明工作台 主活动
 * 用 WebView 加载 assets/index.html（改造版单文件待办 App）。
 * 关键适配：
 *  - setDomStorageEnabled(true)：否则 HTML 的 localStorage 存不住（待办数据丢失）。
 *  - WebChromeClient.onShowFileChooser：把「导入 JSON」的文件选择桥接到系统选择器。
 *  - addJavascriptInterface(..., "AndroidBridge")：供 JS 识别原生环境（window.AndroidBridge 存在）。
 */
public class MainActivity extends AppCompatActivity {

    private WebView wv;
    private ValueCallback<Uri[]> filePathCallback;

    // 文件选择回传：系统选择器选完文件后，把 Uri 回传给 WebView 的 ValueCallback
    private final ActivityResultLauncher<String> fileChooserLauncher =
            registerForActivityResult(new ActivityResultContracts.GetContent(), result -> {
                if (filePathCallback == null) return;
                Uri[] results = (result == null) ? null : new Uri[]{result};
                filePathCallback.onReceiveValue(results);
                filePathCallback = null;
            });

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        wv = findViewById(R.id.webview);
        wv.getSettings().setJavaScriptEnabled(true);
        wv.getSettings().setDomStorageEnabled(true);   // ★ 不开则 localStorage 存不住
        wv.getSettings().setAllowFileAccess(true);
        wv.getSettings().setAllowContentAccess(true);

        wv.setWebViewClient(new WebViewClient());
        wv.setWebChromeClient(new WebChromeClient() {
            // ★ 否则「导入」文件选择失效
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> filePathCallback,
                    FileChooserParams fileChooserParams) {
                MainActivity.this.filePathCallback = filePathCallback;
                fileChooserLauncher.launch("*/*");
                return true;
            }
        });

        // 供 JS 检测原生环境（改造版 index.html 的 native 检测依赖此对象）
        wv.addJavascriptInterface(new Object() {
        }, "AndroidBridge");

        wv.loadUrl("file:///android_asset/index.html");
    }

    // 返回键：WebView 可后退时内部后退，否则退出活动
    @Override
    public void onBackPressed() {
        if (wv != null && wv.canGoBack()) {
            wv.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
