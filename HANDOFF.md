# World Creator 引き継ぎ書

## 現在地
- Repository: reitrpg/Re-The-ultimate-world
- Pages: https://reitrpg.github.io/Re-The-ultimate-world/
- App version: 0.0.27
- Service Worker cache: world-creator-v22
- 「読み込みが遅い」問題は解決済み。
- 追加の起動・描画パフォーマンス改善も実施済み。

## 読み込み遅延の原因調査・確定（2026-09-29）
### 原因
**Service Worker の stale-while-revalidate 処理が読み込み遅延の原因だった。**

キャッシュが存在していても毎回ネットワーク fetch を開始する構成だったため、静的SPAでは不要なネットワーク処理が発生していた。

### 検証結果
- stale-while-revalidate → cache-first
- Service Worker cache: v18 → v19
- main.jsの登録URL: ?v=18 → ?v=19
- ユーザー確認により読み込み遅延解決を確認

### 対応コミット
- 8cdebda1433d9135a4343e83278a27bba690d490 — Service Workerをcache-first化
- 96c6f7d623df54c4f5a8f2547307382c8f245276 — cache v19
- 9b3a3b640f03d9f578f01361b7f9fd70f057b751 — 本原因を引き継ぎ書へ記録

## 追加パフォーマンス改善（2026-09-29）
### 1. Service Worker登録を起動処理から分離
js/core/main.js
- ゲーム本体の初期化を先に完了させる。
- Service Worker登録は requestIdleCallback を優先し、非対応環境では1秒後に実行。
- Service Worker登録・更新処理がゲーム起動を直接競合しにくい構成に変更。

Commit:
- d65dbca93f077fff45614b012960b73ad53e934a

### 2. エントリーモジュールをmodulepreload
index.html
- js/core/main.js に rel="modulepreload" を追加。
- HTML解析後のモジュール取得開始を早める。

Commit:
- 110352cf4706d2286385e88a8c2ee358fd93b8cf

### 3. 入力監視を一本化
js/core/InputManager.js
js/ui/TabUI.js
- TabUI独自のpointerup/touchend/click監視を削除。
- InputManagerの input:pressed イベントをTabUIが利用。
- イベント監視の重複を削減。

Commits:
- 993ff941992ad7a41abcb6a236cd01724beb0f6b
- 36d7fd6e42978c5565e2524de95fdc090cd7d247

### 4. UIの全体再描画ループを削除
js/ui/UI.js
- 全UIモジュールを毎回まとめて再描画する仕組みを削除。
- 各UIモジュールが必要なイベントだけで更新する構成へ変更。

Commit:
- 8f65842976a405cb74d072b647bd21960b5b0dc1

### 5. 世界UI・変換UIの再描画を抑制
js/ui/WorldUI.js
- 世界カード全再生成を最大100ms間隔へ制限。

js/ui/ConverterUI.js
- 変換UI再生成を最大200ms間隔へ制限。

Commits:
- abb0c429eabed30c1d114b313e6257f2cebb821d
- a7fcfb2c99dbd95b0920cd2da9396ee0e4c1d04f

### 6. World.jsの起動後エラー要因を修正
js/world/World.js
- eventBus のimport不足を修正。
- WorldUIから呼ばれている getLevelMultiplier() を実装。
- Lv²/100を返す既存仕様に合わせた表示用倍率として追加。

Commit:
- a926f6345c948ffdc42148564ba44a4f27d75b46

## 現在の方針
- Service Workerはcache-first。
- 起動直後はゲーム本体を優先し、SW登録はアイドル時へ延期。
- 入力イベントはInputManagerを中心に処理。
- UIは全体一括再描画ではなく、各モジュールの必要イベントで更新。
- 高頻度でDOMを全再生成するUIは更新間隔を制限。

## 注意
- 今回の追加変更は読み込み・起動・描画負荷の改善を目的としたもの。
- ゲーム仕様そのものの変更は目的としていない。
- World.jsのeventBus import不足は今回の読み込み遅延の原因ではないが、別の実行時エラー要因だったため修正済み。
- 既存仕様を変更する大型改修は別途扱う。

## 世界作成UI修正（2026-09-29）
- 旧修正では「世界作成」ボタンが表示されない問題を解消できていなかった。
- 追加調査で、`EPManager` が存在しない `BigNumber.lt()` / `BigNumber.gte()` を呼び出していたことを確認。`less()` / `greaterOrEqual()` に修正。
- `WorldUI.render()` を部分的に例外処理し、世界カード描画失敗時でも世界作成UIの描画を継続。
- `index.html` に世界作成ボタンの初期フォールバックを追加。
- アプリバージョンを `0.0.25` → `0.0.26` に更新。
- Service Worker cacheを `v21` に更新。

対応コミット:
- `9a81cc2` — BigNumber比較メソッド修正
- `6b0b53c` — 世界作成UIの描画継続
- `9cd8dc7` — 世界作成ボタンのHTMLフォールバック・バージョン更新
- `806128d` — アプリバージョン0.0.26
- `5061184` / `7004dcc` — Service Worker v21

## 次の作業
- 読み込み遅延対策は完了。
- 2026-09-29: 「世界作成」ボタンが表示されない問題を修正。WorldUIの #next-world が空になる経路を確認し、UnlockManagerの解放コスト計算を安全化。異常に大きい/不正な unlockedWorlds 値でも計算ループが暴走しないよう上限を設定。
- Service Worker cache: v20 に更新し、今回の修正を確実に配布する構成へ変更。
- 次のWC機能・不具合対応へ進む。


## 世界カード・Lv生産補正変更（2026-09-29）
- 世界カード内の「転生」ボタンを削除。転生機能自体は上部の「転生」タブ側に残す。
- 世界の生産量にLv補正を追加。
- Lv補正は max(1, floor(Lv / 10))。
- Lv1〜19: ×1、Lv20〜29: ×2、Lv30〜39: ×3……。
- これまでのLv²/100方式は廃止。
- アプリバージョンを 0.0.26 → 0.0.27。
- Service Worker cacheを v21 → v22。

対応コミット:
- 85c547e8 — Lvによる生産倍率を変更
- f2c528d2 — 世界カードの転生ボタン削除
- 12a67b7e — アプリバージョン0.0.27 / SW v22
- c44b2239 — 表示バージョン更新
- a8ddab38 — Service Worker cache v22
