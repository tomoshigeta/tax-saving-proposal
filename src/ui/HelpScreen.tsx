import { INCOME_TAX_RATES, RESIDENT_TAX_PERCENT, SIMULATION_YEARS } from '../domain/types'
import { STRUCTURES, STRUCTURE_KEYS } from '../domain/structures'

interface Props {
  onBack: () => void
}

export function HelpScreen({ onBack }: Props) {
  return (
    <div className="help">
      <header className="toolbar">
        <button type="button" className="btn btn-quiet" onClick={onBack}>
          ← 一覧
        </button>
        <h1>使い方</h1>
      </header>

      <article className="help-body">
        <p className="help-lead">
          物件の情報を入れると、キャッシュフローと節税効果をまとめたA4の提案書を作ります。
          作った提案書は一覧に残り、あとから開いて数字を変えられます。
        </p>

        <section>
          <h2 className="rule-title">提案書の作り方は2通り</h2>
          <div className="help-cols">
            <div className="help-card">
              <h3>1件だけなら「新規作成」</h3>
              <ol>
                <li>一覧画面の右上「新規作成」を押す</li>
                <li>物件・資金・収支・顧客の順に入力する</li>
                <li>右側の「試算結果」が入力と同時に更新される</li>
                <li>「提案書をプレビュー」を押す</li>
              </ol>
            </div>
            <div className="help-card">
              <h3>まとめて作るなら Excel</h3>
              <ol>
                <li>一覧画面の「Excelテンプレート」を押して落とす</li>
                <li>3行目から<strong>1行に1物件</strong>ずつ書く</li>
                <li>「Excelから取り込み」でそのファイルを選ぶ</li>
                <li>取り込まれた物件を開いて写真を足す</li>
              </ol>
            </div>
          </div>
          <p className="help-note">
            Excelの「構造」と「所得税率」は<strong>プルダウンから選んでください</strong>。
            手で書くと表記違いで取り込めません。取り込めなかった行は、Excel上の行番号と
            理由が画面に出ます。<strong>1行の不備で他の行は止まりません。</strong>
          </p>
        </section>

        <section>
          <h2 className="rule-title">入力のとき迷いやすいところ</h2>
          <dl className="help-defs">
            <div>
              <dt>建物価格 / うち設備価格</dt>
              <dd>
                どちらも物件価格の<strong>内数</strong>です。土地価格は「物件価格 − 建物価格」で
                自動計算されます。設備価格は建物価格の内数で、
                <strong>RC造を選んだときだけ</strong>入力できます。
              </dd>
            </div>
            <div>
              <dt>仲介手数料</dt>
              <dd>
                <strong>税務上の経費にはなりません。</strong>手元からは出ていきますが、
                建物に対応する分は取得価額に加算され、減価償却を通じて経費になります。
                アプリが自動で振り分けます。
              </dd>
            </div>
            <div>
              <dt>ローン事務手数料</dt>
              <dd>手元から出ていき、かつ<strong>初年度の経費</strong>になります。</dd>
            </div>
            <div>
              <dt>管理費・修繕積立金</dt>
              <dd>管理費と修繕積立金を<strong>合算した月額</strong>を入れてください。</dd>
            </div>
            <div>
              <dt>固定資産税・都市計画税</dt>
              <dd>ここだけ<strong>年額</strong>です。家賃と管理費は月額です。</dd>
            </div>
            <div>
              <dt>現在年齢</dt>
              <dd>
                2枚目の年齢欄にしか使いません。<strong>金額計算には影響しません。</strong>
              </dd>
            </div>
            <div>
              <dt>写真</dt>
              <dd>
                室内でも外観でも構いません。<strong>1枚だけ</strong>です。間取り図・図面は扱いません。
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="rule-title">提案書の出し方</h2>
          <p>
            プレビュー画面の「印刷 / PDF出力」を押すと、ブラウザの印刷画面が開きます。
            送信先を<strong>「PDFに保存」</strong>にすればPDFになります。
          </p>
          <ul>
            <li>1枚目はA4ちょうどに収まります</li>
            <li>
              「2枚目に年次明細を付ける」を入れると、年ごとの内訳(賃料収入・減価償却費・支払利息・
              不動産所得・節税額・残債)が2枚目に付きます。数字の根拠を聞かれたとき用です
            </li>
            <li>印刷設定の「背景のグラフィック」は<strong>オンのまま</strong>にしてください</li>
          </ul>
        </section>

        <section>
          <h2 className="rule-title">この試算の前提</h2>
          <p>提案書の数字は、次の前提で計算しています。顧客に説明する前に確認してください。</p>
          <ul className="help-assumptions">
            <li>
              <strong>試算期間は{SIMULATION_YEARS}年で固定</strong>です。顧客の年齢や定年時期、
              ローンの返済期間には影響されません
            </li>
            <li>
              <strong>家賃保証(サブリース)前提</strong>で、空室率と家賃下落は見ていません。
              保証賃料は全期間そのままです
            </li>
            <li>
              税率は<strong>選んだ所得税率({INCOME_TAX_RATES.join(' / ')}%)＋住民税
              {RESIDENT_TAX_PERCENT}%</strong>を赤字に掛けるだけの簡易計算です。累進課税は反映しません。
              <strong>顧客の課税所得が赤字を吸収できるだけ大きいことが前提</strong>になります
            </li>
            <li>
              赤字のうち<strong>土地の取得に対応する借入金利子は損益通算から除いています</strong>
              (租税特別措置法41条の4)。区分は建物優先充当によります
            </li>
            <li>
              減価償却は定額法。中古は簡便法で耐用年数を出します
              ({STRUCTURE_KEYS.map((k) => `${STRUCTURES[k].label} ${STRUCTURES[k].usefulLife}年`).join(' / ')})
            </li>
            <li>初年度の減価償却は月割せず、満1年分を計上します</li>
            <li>
              不動産所得が黒字になった年の節税額は0として扱い、
              <strong>増税としては表示しません</strong>
            </li>
            <li>
              <strong>売却時の課税は含みません。</strong>減価償却による節税の多くは繰り延べで、
              売却時に譲渡所得として戻ります
            </li>
          </ul>
        </section>

        <section>
          <h2 className="rule-title">データの保存について（重要）</h2>
          <div className="help-warn">
            <p>
              提案書は<strong>お使いのブラウザの中</strong>に保存されます。サーバーには送られません。
              そのため次の点に注意してください。
            </p>
            <ul>
              <li>
                <strong>ブラウザの閲覧履歴やキャッシュを消すと、提案書も消えます</strong>
              </li>
              <li>別のPCやブラウザからは、同じ提案書は見えません</li>
              <li>PCを買い替えると引き継がれません</li>
            </ul>
            <p>
              大事な提案書は、一覧画面の<strong>「バックアップ書き出し」</strong>で
              ファイルに残してください。別のPCでは<strong>「バックアップ取り込み」</strong>で戻せます。
            </p>
          </div>
        </section>

        <section>
          <h2 className="rule-title">いまできないこと</h2>
          <ul>
            <li>PDFや図面の取り込み(写真1枚のみ)</li>
            <li>図面からの自動読み取り</li>
            <li>売却時の手残りシミュレーション</li>
            <li>空室率・家賃下落の反映</li>
            <li>RC造以外での設備の分離償却</li>
            <li>Excelへの書き出し(取り込みのみ)</li>
          </ul>
        </section>
      </article>
    </div>
  )
}
