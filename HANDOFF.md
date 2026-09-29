# World Creator 引き継ぎ書

## 現在地
- Repository: reitrpg/Re-The-ultimate-world
- Pages: https://reitrpg.github.io/Re-The-ultimate-world/
- App version: 0.0.25
- Service Worker cache: world-creator-v19
- 「読み込みが遅い」問題は**解決済み**。
- 原因切り分けでは、原因候補を1個ずつ変更して確認する方針を採用。

## 読み込み遅延の原因調査・確定（2026-09-29）
### 原因
**Service Worker の stale-while-revalidate 処理が読み込み遅延の原因だった。**

`service-worker.js` では、キャッシュが存在していても毎回バックグラウンドでネットワーク `fetch()` を開始する構成になっていた。

WCは静的SPAのため、キャッシュ済みのリソースに対しても毎回ネットワーク処理を発生させる必要性が低く、これが読み込み遅延につながっていた。

### 検証結果
- stale-while-revalidate → cache-first に変更
- Service Worker cache: v18 → v19
- `js/core/main.js` の登録URLも `?v=18` → `?v=19`
- 変更後、**読み込み遅延が解決したことをユーザー確認済み**。
- よって今回の読み込み遅延については、**Service Workerのstale-while-revalidateが確定原因**として記録する。

### 対応コミット
- `8cdebda1433d9135a4343e83278a27bba690d490` — Service Workerをcache-firstへ変更
- `96c6f7d623df54c4f5a8f2547307382c8f245276` — Service Workerキャッシュバージョンをv19へ更新

### 今回の調査で未対応の候補
以前候補として挙げていた `World.js` の `eventBus` import不足は、今回の読み込み遅延の解決とは無関係だったため、**この問題の原因としては扱わない**。
必要になった場合は別問題として調査する。

## 既に実施済みの主な変更
- CSS重複整理・レスポンシブボタン修正
- iOS / Windows / Linux / Chrome向け入力処理整理
- Service Worker cache-first化
- UI更新のrequestAnimationFrameバッチ化
- Resource更新イベントのバッチ化
- 起動時Service Worker更新処理の簡略化
- GitHub Pages向けキャッシュ改善

## 調査時の注意
- 複数原因を同時に変更しない。
- 原因候補を1個ずつ変更し、変更前後で確認する。
- 原因が確定した場合は、原因・変更内容・検証結果・コミットを引き継ぎ書に記録する。
- 問題が解決した場合、未検証の候補を原因として扱わない。
- 既存仕様を変更せず、問題に直接関係する最小変更を優先する。

## 次の作業
- 読み込み遅延については原因究明・修正完了。
- 次のWC作業へ進む。