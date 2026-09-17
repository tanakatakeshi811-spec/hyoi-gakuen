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
| `models/locker.glb` | 廊下・昇降口(靴箱代わり)・体育館(用具ロッカー)の備品 | J-Toastie | [poly.pizza/m/aGmZ4jQD2y](https://poly.pizza/m/aGmZ4jQD2y) | **CC-BY** |
| `models/bed.glb` | 保健室のベッド | Quaternius | [poly.pizza/m/ianC28eMOF](https://poly.pizza/m/ianC28eMOF) | CC0 |
| `models/piano.glb` | 音楽室のピアノ | Poly by Google | [poly.pizza/m/1YoE664mJTd](https://poly.pizza/m/1YoE664mJTd) | **CC-BY** |
| `models/microscope.glb` | 理科室の顕微鏡(実験台の上に設置) | Username12 | [poly.pizza/m/q9zNs4U5NG](https://poly.pizza/m/q9zNs4U5NG) | **CC-BY** |
| `models/gymmat.glb` | 体育館の床マット | Zsky | [poly.pizza/m/gHLnNRu37P](https://poly.pizza/m/gHLnNRu37P) | **CC-BY** |
| `models/easel.glb` | 美術部室のイーゼル | Poly by Google | [poly.pizza/m/6UQpoYGTvkL](https://poly.pizza/m/6UQpoYGTvkL) | **CC-BY** |
| `models/rndtable.glb` | 生徒会室の丸テーブル | Quaternius | [poly.pizza/m/oEArSZykyi](https://poly.pizza/m/oEArSZykyi) | CC0 |

これらの机・黒板・本棚・ロッカー・ベッド・ピアノ・顕微鏡・体育マット・
イーゼル・丸テーブルは見た目だけの飾りで、校舎の壁・床の当たり判定
(グリッドベースの衝突判定ロジック)には変更を加えていません。保健室の
カーテン・生徒会室の椅子・校舎の屋根/窓/昇降口のキャノピーなど、良い
出典が見つからなかったものは既存のプリミティブ形状(箱・円柱・板)で
自作しています。

## 武器(手持ちモデル)

| ファイル | 用途 | 制作者 | 配布元 | ライセンス |
|---|---|---|---|---|
| `models/knife.glb` | カッターナイフの手持ちモデル(元は「Dagger」) | Quaternius | [poly.pizza/m/kSMpR711Y2](https://poly.pizza/m/kSMpR711Y2) | CC0 |
| `models/screwdriver.glb` | ドライバーの手持ちモデル | Poly by Google | [poly.pizza/m/4873ED-rB3o](https://poly.pizza/m/4873ED-rB3o) | **CC-BY** |

教科書・ほうき・モップ・三角コーン・縄跳び・太鼓のバチ・影の手(テネブラの力)は
良い出典が見つからなかったため、既存のプリミティブ形状(箱・円柱・円錐・
トーラス)を組み合わせて自作しています。武器の見た目はキャラクターの
右手あたりに固定オフセットで取り付ける方式(ボーン追従ではない)です。

## テクスチャ(壁・床・天井)

| ファイル | 用途 | 素材名 | 配布元 | ライセンス |
|---|---|---|---|---|
| `textures/wall_interior.jpg` | 校舎の内壁(教室・廊下) | White Plaster 02 | [polyhaven.com/a/white_plaster_02](https://polyhaven.com/a/white_plaster_02) | CC0 |
| `textures/wall_exterior.jpg` | 校舎の外壁 | Beige Wall 001 | [polyhaven.com/a/beige_wall_001](https://polyhaven.com/a/beige_wall_001) | CC0 |
| `textures/floor_classroom.jpg` | 教室の床(1年A組/1年B組/2年A組/2年C組) | Laminate Floor | [polyhaven.com/a/laminate_floor](https://polyhaven.com/a/laminate_floor) | CC0 |
| `textures/floor_corridor.jpg` | 廊下・昇降口の床 | Old Linoleum Flooring 01 | [polyhaven.com/a/old_linoleum_flooring_01](https://polyhaven.com/a/old_linoleum_flooring_01) | CC0 |
| `textures/floor_gym.jpg` | 体育館の床 | Diagonal Parquet | [polyhaven.com/a/diagonal_parquet](https://polyhaven.com/a/diagonal_parquet) | CC0 |
| `textures/floor_generic.jpg` | それ以外の特別教室(保健室・理科室・音楽室・美術部室・生徒会室・図書室・資料室) | Floor Tiles 06 | [polyhaven.com/a/floor_tiles_06](https://polyhaven.com/a/floor_tiles_06) | CC0 |
| `textures/ceiling.jpg` | 全室共通の天井/屋根裏 | Ceiling Interior | [polyhaven.com/a/ceiling_interior](https://polyhaven.com/a/ceiling_interior) | CC0 |

Poly Haven(https://polyhaven.com/)のテクスチャは全てCC0(クレジット表記は
法的には不要)。three.jsの`TextureLoader`で読み込み、`RepeatWrapping`+
`repeat`でタイル貼りして間延びを防いでいます。用途(教室/廊下/体育館/
特別教室/内壁/外壁)ごとに別のテクスチャを割り当て、全部同じ使い回しには
していません。

## ライセンス補足

- CC0(Creative Commons Zero)のモデルは個人・商用問わず自由に利用・改変・
  再配布が可能で、クレジット表記も法的には不要です
- CC-BYのモデル(机・黒板・ロッカー・ピアノ・顕微鏡・体育マット・イーゼル・
  ドライバー)は元の制作者のクレジット表記が必要なライセンスです。上記の
  表にある「制作者」「配布元」の記載をもって表示義務を満たしています。
  モデル自体の改変(色や配置の変更、スケール補正)は行っていますが、
  再配布はしていません
