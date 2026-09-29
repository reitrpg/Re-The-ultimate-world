# World Creator 引き継ぎ書

## 現在地
- Repository: reitrpg/Re-The-ultimate-world
- Pages: https://reitrpg.github.io/Re-The-ultimate-world/
- Base commit: `c0d970fbedae081e10fe06e7ceb50a57d4b15d7c`
- App version: 0.0.25
- Service Worker cache: world-creator-v18
- 現在は「読み込みが遅い」問題を原因切り分け中。
- 方針: **可能性の高い原因から1個ずつ修正し、修正前後で原因への影響を確認する。最終的には候補を全て処理する。**

## 読み込み遅延の原因候補（優先順）
### 1. Service Worker のコード破損
現行 `service-worker.js` に、通常の改行ではなく文字列として `\\n` が混入している箇所を確認済み。
対象:
- `self.addEventListener("message", ...)` 周辺
- `self.addEventListener("activate", ...)` の直前

このため Service Worker の構文解析・インストールに失敗する可能性がある。
**最初にここだけを修正して挙動を確認する。**

### 2. Service Worker の stale-while-revalidate
現行SWは同一オリジンのGETについて、キャッシュが存在していても毎回 `fetch()` を開始する。
WCは静的SPAなので、通信を毎回発生させる構成は読み込み遅延・通信負荷の原因候補。
1の検証後、必要なら cache-first に変更して比較する。

### 3. World.js の eventBus import不足
現行 `js/world/World.js` では `eventBus.emit("resource:update")` を使用しているが、確認時点のimportに `eventBus` が存在しない。
これは読み込みそのものより起動後エラーの候補。
Service Worker原因を検証した後に個別修正する。

## 既に実施済みの主な変更
- CSS重複整理・レスポンシブボタン修正
- iOS / Windows / Linux / Chrome向け入力処理整理
- Service Worker cache v18
- UI更新のrequestAnimationFrameバッチ化
- Resource更新イベントのバッチ化
- 起動時Service Worker更新処理の簡略化
- GitHub Pages向けキャッシュ改善

## 調査時の注意
- 複数原因を同時に変更しない。
- 各修正後に読み込み速度・Service Worker状態・起動エラーを確認する。
- 改善しなかった場合も「その原因では改善しなかった」という結果を記録し、次の候補へ進む。
- 現在の問題を理由に、いきなり大規模リファクタリングを行わない。
- 既存仕様を変更せず、原因候補に直接関係する最小変更を優先する。

## 次の作業
1. `service-worker.js` の混入した `\\n` を修正。
2. それだけで再確認。
3. 改善しなければ候補2へ進む。
