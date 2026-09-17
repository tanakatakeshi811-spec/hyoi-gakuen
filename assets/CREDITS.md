# アセット クレジット

このプロジェクトで使用している既製3Dモデル素材の出典・ライセンス一覧です。
CC0のものは著作権表示が法的には不要ですが、制作者への敬意として明記します。
**CC-BYのものは表示が必須**のため、このファイルをもってクレジット表記とします。

## キャラクターモデル

| ファイル | 用途 | 制作者 | 配布元 | ライセンス |
|---|---|---|---|---|
| `models/man.glb` | 男性キャラクターの共通ベース(主人公・男子生徒・男性教師など) | Quaternius | [poly.pizza/m/HMnuH5geEG](https://poly.pizza/m/HMnuH5geEG) | CC0 |
| `models/woman.glb` | 女性キャラクターの共通ベース(主人公・女子生徒・女性教師など) | Quaternius | [poly.pizza/m/qJ2gsTUBHL](https://poly.pizza/m/qJ2gsTUBHL) | CC0 |

- 髪・肌・服・目の色はキャラクターごとにゲーム側でマテリアルの色だけを
  塗り替えて使用しています(モデル自体の改変・再配布はしていません)
- アニメーション(Idle/Walk/気絶ポーズ)はモデルに同梱のものをそのまま
  `THREE.AnimationMixer` で再生しています

## 背景・小物

| ファイル | 用途 | 制作者 | 配布元 | ライセンス |
|---|---|---|---|---|
| `models/tree.glb` | 中庭の木 | Quaternius | [poly.pizza/m/qZtx0AHhcy](https://poly.pizza/m/qZtx0AHhcy) | CC0 |
| `models/desk.glb` | 教室の机・椅子(1年A組/1年B組/2年A組/図書室) | Jonathan Granskog | [poly.pizza/m/eP6XIy9ox83](https://poly.pizza/m/eP6XIy9ox83) | **CC-BY** |
| `models/blackboard.glb` | 教室の黒板 | Poly by Google | [poly.pizza/m/2Qv_L8pbv6W](https://poly.pizza/m/2Qv_L8pbv6W) | **CC-BY** |
| `models/bookcase.glb` | 図書室の本棚 | Quaternius | [poly.pizza/m/tACDGJ4CGW](https://poly.pizza/m/tACDGJ4CGW) | CC0 |

これらの机・黒板・本棚は見た目だけの飾りで、校舎の壁・床の当たり判定
(グリッドベースの衝突判定ロジック)には変更を加えていません。

## ライセンス補足

- CC0(Creative Commons Zero)のモデルは個人・商用問わず自由に利用・改変・
  再配布が可能で、クレジット表記も法的には不要です
- CC-BYのモデル(机・黒板)は元の制作者のクレジット表記が必要なライセンスです。
  上記の表にある「制作者」「配布元」の記載をもって表示義務を満たしています。
  モデル自体の改変(色や配置の変更)は行っていますが、再配布はしていません
