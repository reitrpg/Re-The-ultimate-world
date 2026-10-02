# World Creator 引き継ぎ書

## 現在地
- Repository: reitrpg/Re-The-ultimate-world
- Pages: https://reitrpg.github.io/Re-The-ultimate-world/
- App version: 0.0.61
- Service Worker cache: world-creator-v56
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


## Lv生産補正・基礎生産量再調整（2026-09-29）
- Lv補正を「倍率」ではなく「加算値」に変更。
- 生産計算: `(基礎生産量 + max(1, floor(Lv / 10))) × 資源補正 × 転生倍率 × 全体補正`。
- Lv1〜19は +1、Lv20〜29は +2、Lv30〜39は +3……。
- 基礎生産量を 1 → 10 に増加。
- 既存セーブで基礎生産量が1以下の場合も10へ補正。
- 転生後の基礎生産量も10へ変更。
- アプリバージョンを 0.0.27 → 0.0.28。
- Service Worker cacheを v22 → v23。

対応コミット:
- b90584d8 — 加算式への変更・基礎生産量増加
- 47359433 — アプリバージョン0.0.28 / SW v23
- 7c22ad04 — 表示バージョン更新
- 144472d9 — Service Worker cache v23


## セーブ削除時の完全リセット修正（2026-09-29）
- 原因: `SaveManager.clear()` はLocalStorageだけを削除しており、実行中のManager状態をリセットしていなかった。
- さらに削除直後の `beforeunload` が `SaveManager.save()` を実行するため、削除したはずの古い状態が再保存される経路があった。
- 修正: セーブ削除時にGameを停止し、World / Unlock / Resource / EP / Research / Upgrade / Rebirthをランタイム上でも初期化。
- 削除処理中は `SaveManager.save()` を無効化し、beforeunloadによる旧データ再保存を防止。
- その後のページ再読み込みでは初期状態から開始する。
- 世界数・世界解放コスト・リソース・生産処理も初期状態へ戻る。
- アプリバージョンを 0.0.28 → 0.0.29。
- Service Worker cacheを v23 → v24。

対応コミット:
- dd9439d7 — Unlock状態リセット
- c1e75476 — セーブ削除時の完全リセット
- 1dc91a5e — アプリバージョン0.0.29 / SW v24
- 72e5ec15 — 表示バージョン更新
- a0d87673 — Service Worker cache v24


## セーブ削除後の表示・オフライン進行修正（2026-09-29）
- スクリーンショットで確認された「世界カードが消えているのに解放コストが高い」状態を調査。
- 原因の一つとして `WorldUI.createWorldCard()` 内に削除済みの `rebirth` 変数を `appendChild()` している残存コードがあり、世界カード描画が例外終了していた。これを削除。
- そのため実際には初期世界が生成されていても、カードだけ表示されず、下部の世界作成UIだけが表示される状態になっていた。
- セーブ削除直後の `beforeunload` でオフライン進行用タイムスタンプを再保存していた問題も修正。
- セーブ削除時に1回だけオフライン進行をスキップするフラグをsessionStorageへ設定し、削除直後のリロードで過去時間分の生産を発生させない。
- 削除処理中はbeforeunloadのタイムスタンプ保存・セーブ保存も実行しない。
- アプリバージョンを 0.0.29 → 0.0.30。
- Service Worker cacheを v24 → v25。

対応コミット:
- a3d0d094 — 世界カード描画例外修正・リセット後再描画対応
- 8be6ed22 — セーブ削除後のオフライン進行抑止
- 8720dd48 — beforeunloadによる再保存・タイムスタンプ保存抑止
- 7c2e8945 — アプリバージョン0.0.30 / SW v25
- a2efa6ee — 表示バージョン更新
- f5d6584a — Service Worker cache v25


## セーブ削除後も古い状態が復活するケースへの追加対策（2026-09-29）
- スクリーンショット確認時に表示されていたアプリは **v0.0.29** で、最新のv0.0.30コードが実行されていない状態だった。
- PWAのキャッシュ更新遅延に加え、古いランタイムが削除直前に保存処理を行っても復旧できるよう、セーブ削除時に `world_creator_reset_pending` をLocalStorageへ記録。
- 起動時にこのフラグが残っている場合は、セーブ本体とオフライン時刻を先に削除してからロードするため、古いランタイムが再保存した状態も読み込まない。
- beforeunloadでもこのフラグを確認し、リセット処理中の再保存を防止。
- アプリバージョンを **0.0.31**、Service Workerを **v26** に更新。
- index.htmlのmain.jsにもバージョンクエリを付与して、旧アプリシェルから新ランタイムへの移行を促進。


## v0.0.32 Service Worker更新反映対策（2026-09-29）
- 既存のService Workerが制御中の場合、新しいWorkerのcontrollerchangeを検知してページを自動リロードする処理を追加。
- 待機中Workerが存在する場合はSKIP_WAITINGを送信。
- 初回起動時のcontrollerchangeでは自動リロードしない。
- アプリバージョンを **0.0.32**、Service Workerを **v27** に更新。


## v0.0.33 初期世界0個仕様への修正（2026-09-29）
- 初期状態は **世界0個** が正しい仕様であることを確認。
- `main.js` の起動時自動世界生成を削除。
- `SaveManager.load()` の世界0個時自動生成を削除。
- `UnlockManager.unlockedWorlds` の初期値を **0** に変更。
- セーブロード時も0を有効値として扱うよう変更。
- セーブ削除時の `UnlockManager.reset()` も0に変更。
- セーブ削除直後は「世界0個・資源0・EP0」となり、世界はユーザーが「世界作成」を押すまで生産を開始しない。
- `WorldUI.js` に残っていた存在しない `world.getLevelMultiplier()` 呼び出しを `getTotalMultiplier()` に修正。世界カード描画時の例外も解消。
- アプリバージョンを **0.0.33**、Service Workerを **v28** に更新。


## v0.0.34 世界作成コスト仕様修正（2026-09-29）
- 初期状態: 世界0個 / EP0 / 植物0 / 金属0 / 魔力0。
- 世界0個: 「世界作成」コスト **0 EP**。
- 1個目を作成した後: 2個目のコスト **1e100 EP**。
- 以降は作成済み世界数が1増えるごとに、必要EPの10進指数を **100倍**。
  - 0個: 0 EP
  - 1個: 1e100 EP
  - 2個: 1e10000 EP
  - 3個: 1e1000000 EP
- BigNumber側の最大指数制限（1,000,000）に達した場合はそれ以上を保持できないため、現在の数値システム上はそこが上限。
- アプリバージョン **0.0.34**、Service Worker **v29**。


## v0.0.35 多重指数 BigNumber 対応（2026-09-29）
- 世界作成コストが通常の指数上限に到達した後も扱えるよう、BigNumberに指数層（layer）を追加。
- 既存の通常値は layer 0 のまま互換維持。
- 世界作成コストは以下の順で拡張:
  - 世界0個: 0 EP
  - 世界1個: 1e100 EP
  - 世界2個: 1e10000 EP
  - 世界3個: 1e1000000 EP
  - 世界4個: 1ee1,000,000 EP = 10^(10^1,000,000)
  - 世界5個以降: 第2指数層の指数を2ずつ増加
- BigNumberのJSON保存形式に layer を追加。旧セーブの layer 欠落は0として読み込む。
- 巨大値の toNumber() はInfinityとなるため、Formatterは上位層では直接文字列表記を使用。
- BigNumberの比較処理は指数層→指数→仮数の順に比較。
- 上位層の加減算は巨大値向けの支配項近似を使用。世界作成コストの比較・消費を成立させる。
- アプリバージョン: **0.0.34 → 0.0.35**
- Service Worker cache: **v29 → v30**


## v0.0.36 植物リセット・Lv生産量修正（2026-09-30）
- 初期リソースの生産量を0へ変更。セーブ読み込み時も負値以外は保存値を維持するため、リセット直後の生産量が1へ戻らないよう修正。
- 世界のLv生産補正を単純な `floor(Lv / 10)` から累積式へ変更。
- Lv57のLv補正は指定式 `1 + 1×10 + 2×10 + 3×10 + 4×10 + 5×7 = 136` になる。
- アプリバージョン: **0.0.35 → 0.0.36**
- Service Worker cache: **v30 → v31**


## v0.0.37 Lv生産量計算修正（2026-09-30）
- v0.0.36で実装したLv生産量の計算式を再修正。
- 指定仕様は、Lvを10Lv単位の区間に分け、各区間の1Lvあたり生産量を1, 2, 3...とする累積式。
- 基礎生産量は1。
- 例:
  - Lv1: 1 + 1×1 = 2
  - Lv2: 1 + 1×2 = 3
  - Lv10: 1 + 1×10 = 11
  - Lv15: 1 + 1×10 + 2×5 = 21
  - Lv57: 1 + 1×10 + 2×10 + 3×10 + 4×10 + 5×7 = 136
- World.js のLv補正計算を10Lv区間の累積処理へ変更。
- アプリバージョン: 0.0.36 → 0.0.37
- Service Worker cache: v31 → v32


## v0.0.38 小数倍率計算修正（2026-09-30）
- Lv28の生産表示を確認したところ、植物・魔力は正しい一方、金属の倍率0.75だけが `+4.13e+4/秒` になっていた。
- 原因はBigNumberの正規化で `0.75` のような1未満の値を扱えず、仮数を750へ変換した際に指数0へ切り詰めていたこと。
- `Constants.js` の最小指数を0から負数対応へ変更し、0.75などの小数倍率を正しく保持できるよう修正。
- これにより `55 × 0.75 = 41.25` が正しく計算される。
- アプリバージョン: **0.0.37 → 0.0.38**
- Service Worker cache: **v32 → v33**


## v0.0.39 リロード時のアップデート反映・レアリティ倍率表示（2026-09-30）
- 通常のリロードでも最新コードを取得できるよう、Service Workerのナビゲーション要求（ページ本体）を **network-first** に変更。
- オフライン時は従来どおりキャッシュへフォールバックする。
- これにより、オンラインでリロードした際に最新のindex.htmlを取得し、更新されたmain.jsのバージョンクエリから新しいService Workerの登録・更新へ進める。
- Service Worker更新時は既存のcontrollerchange処理によりページを自動リロードする。
- 世界カードに「レアリティ」と分離して「レアリティ倍率」を表示。現時点では表示のみで、生産計算へは追加していない。
- アプリバージョン: **0.0.38 → 0.0.39**
- Service Worker cache: **v33 → v34**


## v0.0.42 統計・倍率ページ追加（2026-10-01）
- 上部メニューに「統計・倍率」タブを追加。
- 独立した大ページとして現在の世界の情報を確認できる構成に変更。
- 世界・レアリティ、幸運値、幸運補正後のレアリティ確率、各種倍率、資源生産量を表示。
- 幸運値は現在のWorld.luckを参照。
- 幸運補正後確率はv0.0.41の仮実装と同じ計算式を表示側でも使用。
- アプリバージョン: **0.0.41 → 0.0.42**
- Service Worker cache: **v36 → v37**

## v0.0.41 幸運値によるレアリティ確率仮実装（2026-10-01）
- 幸運値を World.luck として追加。現時点の初期値は0。
- 幸運値を直接確率へ乗算せず、実効幸運値 ln(1 + Luck) に変換。
- レアリティ間の幸運コストを 10 × rarityIndex^1.5 とし、下位レアリティの確率枠を幸運で食って、その分を隣接する上位レアリティへ移動する方式を仮実装。
- 現在の基本確率は既存の5段階（50% / 25% / 15% / 8% / 2%）を維持。
- 幸運値0では従来確率から変化しない。
- 幸運値が増えるほど上位レアリティへ確率が移動するが、上位になるほど必要幸運量が増える。
- 30段階レアリティへの拡張や幸運値そのものの成長方法は未確定のため、今回は仮実装。
- 世界カードに現在の幸運値を表示。
- アプリバージョン: 0.0.40 → 0.0.41
- Service Worker cache: v35 → v36

## v0.0.40 レアリティ名表示（2026-10-01）
- 既存の内部レアリティ値は変更せず、表示名だけを段階名へ変換。
- 1〜5: コモンⅠ〜Ⅴ
- 6〜10: アンコモンⅠ〜Ⅴ
- 11〜15: レアⅠ〜Ⅴ
- 16〜20: スーパーレアⅠ〜Ⅴ
- 21〜25: エピックⅠ〜Ⅴ
- 26〜30: レジェンダリーⅠ〜Ⅴ
- 今回は表示名のみの実装で、抽選確率・Luck・レアリティ倍率の計算は変更していない。
- アプリバージョン: **0.0.39 → 0.0.40**
- Service Worker cache: **v34 → v35**


## v0.0.43 統計・倍率拡張／Luck・言語・シード設定（2026-10-01）
- 「統計・倍率」を内部3ページ構成へ変更。
  - 統計
  - 倍率
  - 能力値
- 統計に以下を追加。
  - ゲーム時間(オンライン)
  - ゲーム時間(全て)
  - 転生回数
  - 総取得素材
  - 総取得EP
- 新規 js/statistics/Manager.js で統計値を管理し、セーブデータへ保存。
- 能力値に「幸運」を追加。
- 幸運値の最低値・初期値を1へ変更。
- 幸運値1ではコモンⅠのみ。コモンⅡ以上は幸運値2以上で初めて抽選対象になる。
- 既存の「下位レアリティの確率枠を幸運で上位へ移動する」仮計算式を、Luck 2以上の抽選へ適用。
- 言語設定にEnglishを追加。
- 世界生成時の世界名を言語設定に応じて日本語／英語で生成。
- 自動生成された世界名は言語変更時に再生成。手動変更した世界名は維持。
- 設定にシード値入力を追加。入力した値は次回の世界作成に使用。
- 設定に「現在の世界のシード値を出力」を追加。入力欄へ表示し、対応環境ではクリップボードにも出力。
- セーブデータバージョンを5へ更新。
- アプリバージョン: **0.0.42 → 0.0.43**
- Service Worker cache: **v37 → v38**

- v0.0.44: 統計・倍率から世界別情報であるレアリティ表示を削除。能力値も幸運のみを表示。

- v0.0.45: 世界カードから幸運値の表示を削除。幸運は「統計・倍率」の能力値で確認する。

- v0.0.46: 統計・倍率の構文不具合を修正し、世界カードから幸運値表示を確実に削除。

- v0.0.47: StatisticsUIの構文エラーでUI.js全体の読み込みが止まり、押下処理・世界カード・資源表示が初期化されていなかった問題を修正。世界カードから幸運値も削除。

- v0.0.48: StatisticsUIをUI.jsの静的importから分離し、統計画面の問題が世界・資源・基本UIの初期化を巻き込まない構造へ変更。InputManagerはPointerEvent環境でもclick経路を併用。


## v0.0.49 強化UI再編（2026-10-01）
- 上部メニューの独立した「強化」大ページを削除し、「世界」ページの世界一覧・世界作成の下側へ強化UIを移動。
- 強化UIを小ページに分割。
  - 無限強化: 強化回数に上限なし。
  - 回数制強化: 最大強化回数を持つ強化用の枠。現在は対象強化未登録のため空表示。
- UpgradeにtypeとmaxLevelを追加し、回数制強化を今後追加できる構造に変更。
- 既存の4強化は仕様変更を避けるため無限強化として維持。
- アプリバージョン: 0.0.48 → 0.0.49
- Service Worker cache: v43 → v44


## v0.0.50 UI基盤修正（2026-10-01）
- UI.jsの初期化配列に残っていた未定義のStatisticsUI参照を削除。
- StatisticsUIは既存どおり動的importで初期化。
- この未定義参照によってUI.initialize()自体が実行されず、世界カード・押下処理を含む各UIが初期化されない問題を修正。
- アプリバージョン: 0.0.49 → 0.0.50
- Service Worker cache: v44 → v45


## システム基盤バグ管理
- ゲーム全体が停止・起動不能・主要UI初期化不能・入力基盤停止など、個別機能ではなくゲーム全体へ波及するシステムミスは、この区分で管理する。
- 通常の機能追加・個別UIバグとは分離して記録する。
- システム基盤を変更する際は、変更対象だけでなく初期化順序・import依存関係・共通入力処理・Service Worker更新を確認する。
- 全体停止につながる変更は、機能実装と同じコミット群に埋もれさせず、原因と修正を明記する。
- 現在確認済みの事例: v0.0.49でUI.jsの初期化配列に残った未定義のStatisticsUI参照によりUI初期化全体が停止。v0.0.50で修正済み。


## v0.0.51 システム基盤再構築
- ゲーム全体を巻き込む初期化失敗を防ぐため、基盤を再構築。
- main.jsの主要モジュールを動的ロード化し、1モジュールのimport失敗で起動全体が停止しない構造へ変更。
- UI.jsをモジュール単位の独立初期化へ変更。個別UIの初期化失敗を他UIへ波及させない。
- InputManagerをpointerup中心に整理し、clickとの二重発火経路を廃止。
- InputActionControllerの例外を入力基盤全体へ再送出しない構造へ変更。
- Service Workerをv46へ更新。


## v0.0.52 基盤互換調整
- UI.initialize()を非同期化し、main.jsが全UIモジュールの初期化完了を待ってからゲーム開始する構造へ調整。
- UIモジュール個別失敗は引き続き隔離。
- 動的ロード化によるbeforeunload時の遅延import依存を廃止し、起動時にロード済みのSaveManager/OfflineProgressを終了処理で再利用。
- Service Worker v47。


## v0.0.53 世界名生成ルール拡張（2026-10-01）
- ランダム生成される世界名から「王国」「帝国」「森林」「海洋」など、世界そのものではない分類名を削除。
- 日本語の自動生成名は「○○世界」または「○○の世界」の2形式に統一。
- 日本語の名前候補を大幅に追加し、組み合わせのバリエーションを拡張。
- 英語も「○○ World」または「World of ○○」の2形式に統一。
- 名前生成用の乱数に新しいインデックスを使用し、既存のレアリティ・固有効果・資源特性のシード結果は変更しない。
- アプリバージョン: **0.0.52 → 0.0.53**
- Service Worker cache: **v47 → v48**


## v0.0.54 世界固有効果
- 世界ごとに固有効果を1つ持つ仕様を実装。
- 固有効果の強さは内部レアリティ1〜30に応じて決定。
- 固有効果: 幸運倍率「天運の星環」、全資源倍率「万象の祝福」、EP変換倍率「黄金律の導き」、植物指定資源倍率「生命樹の恩寵」、金属指定資源倍率「鋼界の加護」、魔力指定資源倍率「魔源の叡智」。
- 指定資源倍率はレアリティ×0.1を基準に倍率を決定。
- 全資源倍率は指定資源倍率より5%低い効果量に設定。
- Generatorで世界生成時にシードから固有効果を決定。
- Worldに固有効果名・種類・倍率・対象資源を取得するAPIを追加。
- 統計・倍率ページに固有効果と固有効果倍率を表示。
- アプリバージョン: 0.0.53 → 0.0.54
- Service Worker cache: v48 → v49

対応コミット:
- 04447c524a0438f2cd79102b52c72050fe4d2079 — World.js 固有効果基盤
- 9851cb6ed4888ffad5ac134f81cd9fa07ec22100 — Generator 固有効果生成
- ada117d5aa297906d845e6605452dd8013b32622 — main.js v0.0.54 / SW v49登録
- 516788aabdbc58da2b7594f58f6a1f52f9839685 — StatisticsUI 固有効果表示

## v0.0.55 倍率ページのカテゴリ分離
- 「統計・倍率」の「倍率」ページを、以下の3カテゴリに分離。
  - 素材別
  - EP
  - 研究
- 各カテゴリは見出しを押すと開閉できる折りたたみ式UIへ変更。
- 開閉状態を下向き矢印「⌄」で表示し、開いているカテゴリは矢印が反転する。
- 「素材別」には世界基礎倍率、転生倍率、固有効果倍率、植物・金属・魔力の補正と生産量を配置。
- 「EP」にはEP変換倍率を配置。EP変換系の固有効果がある場合は固有効果名も表示。
- 「研究」には研究倍率、強化倍率、研究＋強化倍率を配置。
- 幸運系固有効果は「能力値」の幸運と役割が分かれるため、素材別倍率には重複表示しない。
- アプリバージョン: **0.0.54 → 0.0.55**
- Service Worker cache: **v49 → v50**

対応コミット:
- 8a2adbd511586c79fdb4f8f4a46ecd730150282d — StatisticsUIを素材別・EP・研究の折りたたみ構成へ変更
- 61582b7964f09c9920330e4b1a19397ef35e63e0 — 折りたたみUIのCSS追加
- 3e8c428f60d57bf0a688649d7fcddb4456fb7363 — main.js v0.0.55 / SW v50登録
- 22f90a17e040c981ae8d531d57717046fab4b606 — index.html v0.0.55
- 4f3d0f520c82a1dcf73791c85d47ded63ec8363f — Service Worker v50


## v0.0.56 押下処理の二重発火対策（2026-10-02）
- InputManagerの物理入力経路を `pointerup` から `click` に一本化。
- タッチ環境で `pointerup` とブラウザの互換clickが別経路として扱われ、同一の押下処理が二重に発火する問題を防止。
- ネイティブbuttonはブラウザ標準のEnter/Space→clickを利用し、InputManager側のキーボード二重発火も防止。
- `role="button"` のみEnter/SpaceをInputManagerで補完。
- アプリバージョン: **0.0.55 → 0.0.56**
- Service Worker cache: **v50 → v51**


## v0.0.57 押下処理経路の一本化（2026-10-02）
- 押下処理をInputManagerの `click → input:pressed` 経路へ一本化。
- Research / Converter / Upgrade / Rebirth / Settings / Statistics / Worldの主要クリック操作から個別DOM `click` リスナーを削除。
- 動的ボタンには `data-action` を付与し、各UIが `input:pressed` を受け取って処理する構造へ統一。
- 同一対象へのclickが300ms以内に連続到着した場合、InputManager側で同一論理操作として二重発火を抑制。
- ネイティブbuttonのEnter/Spaceはブラウザ標準clickを使用し、独自clickとの二重処理を避ける。
- 統計の折りたたみ矢印はCSS回転を廃止し、閉じた状態「⌄」／開いた状態「⌃」を直接切り替える。
- アプリバージョン: **0.0.56 → 0.0.57**
- Service Worker cache: **v51 → v52**


## v0.0.59 押下処理の物理入力方式をPointer Eventsへ統一（2026-10-02）
- v0.0.58までのclick中心方式でも二重発火が解消しなかったため、物理入力方式そのものを変更。
- タッチ・マウス・ペンを共通化するPointer Eventsを物理入力の単一経路として採用。
- `pointerdown` で対象を記録し、互換mouse/clickイベントの生成を抑止。
- `pointerup` で記録した対象へ1回だけ `input:pressed` を発火。
- `pointercancel` では入力を破棄。
- キーボードはkeydownで1回だけ処理し、標準click生成を抑止。
- これにより「pointerup + click」「pointer + click」の併用による二重発火を構造的に排除。
- アプリバージョン: **0.0.58 → 0.0.59**
- Service Worker cache: **v53 → v54**


## v0.0.60 倍率折りたたみの入力経路分離（2026-10-02）
- 「倍率」の「素材別 / EP / 研究」の折りたたみだけ、汎用 input:pressed 経路から分離。
- StatisticsUI の折りたたみボタンに data-statistics-toggle を付与し、Pointer/Keyboard入力をStatisticsUI自身で1回だけ処理。
- InputManager は統計折りたたみ対象を汎用入力として発火しないよう除外。
- これにより、通常UIと倍率折りたたみで入力経路を分離し、二重発火の原因が倍率UI固有処理にあるかを切り分けられる構造に変更。
- アプリバージョン: **0.0.59 → 0.0.60**
- Service Worker cache: **v54 → v55**

対応コミット:
- cf7fa39b99d86291d5b92b17225d1744c8282f5f — InputManager 統計折りたたみ除外
- 51ed4a37fb1950627deb3a954bd7567de40bc60d — StatisticsUI 専用入力経路
- 79d6ffef68e1449973f7ac60780fe8e327e03551 — main.js v0.0.60 / SW v55登録
- ee6b7217d1f49064598cf64f28c702e6edccfd93 — index.html v0.0.60
- 2334b13f2afb69bd08626dfac3a07f2e288e6f1d — Service Worker v55


## v0.0.61 倍率折りたたみを共通入力経路へ統合（2026-10-02）
- v0.0.60で分離していた「素材別 / EP / 研究」の折りたたみ入力処理を廃止。
- 折りたたみボタンを通常UIと同じ `data-action → InputManager → input:pressed → StatisticsUI` 経路へ戻した。
- StatisticsUI独自のPointer/Keyboardイベント監視を削除。
- InputManager側の統計折りたたみ専用除外処理も削除。
- 折りたたみ自体の表示仕様（hidden、⌄/⌃、素材別のみ初期展開）は維持。
- 「小ページの見せ方違い」であれば既存の安定したUI入力仕様を再利用する方針へ統一。
- アプリバージョン: **0.0.60 → 0.0.61**
- Service Worker cache: **v55 → v56**

対応変更:
- `js/core/InputManager.js` — 統計折りたたみ専用分岐を削除
- `js/ui/StatisticsUI.js` — 折りたたみを `statistics:toggle` アクション化
- `js/core/main.js` — v0.0.61 / SW v56
- `index.html` — v0.0.61
- `service-worker.js` — world-creator-v56


## v0.0.62 入力基盤再調査・単一アクティベーション化（2026-10-02）
- 押下処理の二重発火を入力層から再調査。
- 現行 EventBus は listener を Set で管理しており、同一 callback の重複登録は構造上防止されていることを確認。
- UI側の現行コードから直接 click / pointerdown / pointerup リスナーを除去済みであることを確認。
- InputManagerを以下の構造へ変更。
  - Pointer Events を物理入力の主経路として維持。
  - `isPrimary === false` のポインターを無視し、複数タッチによる重複入力を除外。
  - pointerdown → pointerup の1シーケンスを `pointerId` 単位で管理。
  - pointerdown 時に対象へ pointer capture を設定。
  - pointerdown の既定動作をキャンセルし、互換マウス入力を抑制。
  - click を最終防壁として capture 段階で遮断し、Pointer入力から生成されるネイティブclickがUI処理へ到達しないよう統一。
  - Enter / Space は InputManager が直接 semantic input として処理し、標準click生成を防止。
  - 入力対象外のテキスト入力をキーボード処理で奪わない構造を維持。
- 入力診断領域 `window.__WC_INPUT_DIAGNOSTICS__` を追加。
  - POINTER_DOWN
  - POINTER_UP
  - POINTER_CANCEL
  - KEY_DOWN
  - DISPATCH
  - DISPATCH_COMPLETE
  - NATIVE_CLICK_BLOCKED
  - EVENT_SEND
  - EVENT_RECEIVE
  を最大200件保持。
- 各semantic inputに連番を付与し、物理入力からEventBusまで同一操作を追跡可能にした。
- EventBusの `input:pressed` について送信回数・listener数・各listener受信を診断記録。
- Service Workerをv57へ更新。
- JavaScriptファイルはnetwork-firstへ変更し、古いJSキャッシュと最新JSの混在を防止。
- アプリバージョン: **0.0.61 → 0.0.62**
- Service Worker cache: **v56 → v57**

### v0.0.62 調査結果
- `eventBus.js` は `Set` によるlistener管理。
- 現行UIコードに直接 `click` / `pointerdown` / `pointerup` の個別DOM入力処理は確認されていない。
- 現時点では「UIモジュールの単純な二重listener登録」より、物理Pointer入力と互換click、または複数primary pointer、古いJSキャッシュ混在を優先して対策。
- 次回、実機で1回押下した際の `window.__WC_INPUT_DIAGNOSTICS__.records` を確認すれば、二重発火位置を以下の段階で特定できる。
  1. POINTER_DOWN が2回 → 物理入力層
  2. POINTER_UP が2回 → Pointer入力層
  3. DISPATCH が2回 → InputManager
  4. EVENT_SEND が1回でEVENT_RECEIVEが想定以上 → listener構成
  5. DISPATCHが1回でゲーム処理が2回 → action側
  6. NATIVE_CLICK_BLOCKED が発生 → 互換clickが発生していたことを確認可能


## v0.0.63 UI基盤・Action経路再構成（2026-10-03）
- 「入力層だけを修正しても二重発火が解消しない」ため、UI基盤から入力→Action経路を再監査。
- 従来は `input:pressed` を全UIモジュールへブロードキャストし、各UIが自身に関係するactionかどうかを判定していた。
- v0.0.63で `InputActionController` をsemantic actionの中央ルーターへ変更。
- `input:pressed` の購読者をActionControllerへ集約。
- ActionControllerが `action:<action>` へ1回だけルーティング。
- semantic sequence番号をActionControllerでも検査し、同一sequenceの再処理を遮断。
- UI側は以下のようにaction単位で購読する構造へ変更。
  - WorldUI: `world:category`, `world:rename`
  - TabUI: `tab:change`
  - ResearchUI: `research:buy`
  - UpgradeUI: `upgrade:category`, `upgrade:buy`
  - ConverterUI: `converter:convert`, `converter:convert-all`
  - RebirthUI: `rebirth:request`
  - SettingsUI: `settings:seed-output`
  - SaveUI: save/load/export/import/delete
  - DebugUI: debug actions
  - ErrorUI: `error:clear`
  - StatisticsUI: page変更・倍率折りたたみ
- data-actionを持たない既存のタブ/カテゴリボタンについても、ActionControllerが `data-tab` / `data-world-category` / `data-upgrade-category` からsemantic actionを解決。
- UI全体に対する `input:pressed` ブロードキャスト依存を撤去。
- これにより、1回の入力が複数UIへ渡ってそれぞれがaction判定する構造を解消。
- EventBus自体はイベントごとのSet管理を維持。
- InputManagerのv0.0.62診断機能を維持。
- Service Worker: **v58**
- アプリバージョン: **0.0.63**

### v0.0.63 基盤調査時点の入力経路
```
Pointer / Keyboard
    ↓
InputManager
    ↓
input:pressed
    ↓
InputActionController（唯一の入力購読者）
    ↓
action:<具体的action>
    ↓
対象UI / ゲーム処理
```

- `input:pressed` をUI全体へ直接配布する旧経路は撤去。
- 次の調査対象は、実機でまだ二重発火する場合の「Pointer自体の二重生成」またはManager内部での状態変更・イベント二重発火。


## v0.0.64 押下後の状態復帰対策・UI再描画経路修正（2026-10-03）
- 実機で押下不具合が継続したため、二重発火ではなく「入力処理後に高頻度の再描画でDOMが置換されている」経路を調査。
- WorldManager.update() がゲームTickごとに world:update を発火し、WorldUI が最大100ms間隔で世界カード・世界作成ボタンを全再生成していた。
- resource:update も毎Tick発火し、ConverterUI が最大200ms間隔で変換ボタンを全再生成していた。
- 修正: WorldManager.update() は world:tick を発火し、world:update を構造変更時だけに限定。
- 修正: WorldUI は resource:update で全世界カードを再生成しない。
- 修正: RebirthUI は world:tick で表示値のみ更新。
- 修正: ConverterUI は resource:update でDOMを再生成せず、既存ボタンのdisabled状態だけ更新。
- ゲーム進行TickとインタラクティブDOMの構造再生成を分離。
- アプリバージョン: **0.0.63 → 0.0.64**
- Service Worker cache: **v58 → v59**
