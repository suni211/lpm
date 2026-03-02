import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import './RulesPage.css';

type TabType = 'terms' | 'trading' | 'prohibited' | 'privacy';

const RulesPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'terms';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'terms', label: '이용약관' },
    { key: 'trading', label: '거래규칙' },
    { key: 'prohibited', label: '금지행위 및 처벌' },
    { key: 'privacy', label: '개인정보처리방침' },
  ];

  return (
    <div className="rules-page">
      <div className="rules-container">
        <div className="rules-header">
          <h1>LICO 거래소 이용관리규칙</h1>
          <p className="rules-subtitle">LICO 주식 거래소의 이용약관 및 관리규칙을 안내합니다.</p>
        </div>

        <div className="rules-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`rules-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rules-content">
          {activeTab === 'terms' && <TermsContent />}
          {activeTab === 'trading' && <TradingRulesContent />}
          {activeTab === 'prohibited' && <ProhibitedContent />}
          {activeTab === 'privacy' && <PrivacyContent />}
        </div>
      </div>
    </div>
  );
};

const TermsContent = () => (
  <>
    <h2>LICO 거래소 이용약관</h2>

    <div className="rules-article">
      <h3>제1조 (목적)</h3>
      <p>
        본 약관은 LICO 주식 거래소(이하 "거래소")가 제공하는 주식 거래 서비스 및 관련 제반 서비스(이하 "서비스")의
        이용에 관한 조건 및 절차, 거래소와 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    </div>

    <div className="rules-article">
      <h3>제2조 (용어의 정의)</h3>
      <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
      <ol>
        <li><strong>"거래소"</strong>란 LICO가 운영하는 온라인 주식 거래 플랫폼을 말합니다.</li>
        <li><strong>"회원"</strong>이란 본 약관에 동의하고 거래소에 계정을 등록한 자를 말합니다.</li>
        <li><strong>"주식"</strong>이란 거래소에 상장되어 매매 가능한 디지털 주식 종목을 말합니다.</li>
        <li><strong>"지갑"</strong>이란 회원의 자산(현금 및 주식)을 보관하는 전자지갑을 말합니다.</li>
        <li><strong>"주문"</strong>이란 회원이 주식의 매수 또는 매도를 요청하는 행위를 말합니다.</li>
        <li><strong>"체결"</strong>이란 매수 주문과 매도 주문이 매칭되어 거래가 성사되는 것을 말합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (약관의 효력 및 변경)</h3>
      <ol>
        <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
        <li>거래소는 관련 법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 적용일 7일 전부터 공지합니다.</li>
        <li>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (이용계약의 성립)</h3>
      <ol>
        <li>이용계약은 회원이 되고자 하는 자가 본 약관에 동의하고 가입 신청을 한 후, 거래소가 이를 승낙함으로써 성립합니다.</li>
        <li>회원 가입 시 마인크래프트 계정 인증이 필수적으로 요구됩니다.</li>
        <li>투자성향 설문조사 및 주식계좌 개설 동의를 완료해야 거래 서비스를 이용할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (서비스의 내용)</h3>
      <p>거래소가 제공하는 서비스는 다음 각 호와 같습니다.</p>
      <ol>
        <li>주식 매수 및 매도 거래 서비스</li>
        <li>실시간 시세 조회 서비스</li>
        <li>포트폴리오 관리 및 투자내역 조회 서비스</li>
        <li>자산 입출금 서비스</li>
        <li>뉴스 및 시장 정보 제공 서비스</li>
        <li>지갑 관리 및 복구 서비스</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제6조 (회원의 의무)</h3>
      <ol>
        <li>회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 사항을 준수하여야 합니다.</li>
        <li>회원은 자신의 계정 정보를 안전하게 관리할 의무가 있으며, 이를 제3자에게 양도하거나 대여할 수 없습니다.</li>
        <li>회원은 거래소의 서비스를 이용하여 얻은 정보를 거래소의 사전 승낙 없이 복제, 배포, 방송 등에 사용할 수 없습니다.</li>
        <li>회원은 서비스 이용 시 허위 정보를 제공하거나 타인의 정보를 도용하여서는 안 됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (서비스 이용의 제한 및 중지)</h3>
      <ol>
        <li>거래소는 시스템 점검, 교체 및 고장, 통신 두절 등의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
        <li>거래소는 회원이 본 약관 또는 관련 규정을 위반한 경우 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.</li>
        <li>거래소는 서비스 이용 제한 시 그 사유 및 기간을 회원에게 통지합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제8조 (면책조항)</h3>
      <ol>
        <li>거래소는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 인한 서비스 제공 불능에 대해 책임을 지지 않습니다.</li>
        <li>거래소는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
        <li>주식 거래에 따른 투자 손실은 전적으로 회원 본인의 책임입니다.</li>
      </ol>
    </div>
  </>
);

const TradingRulesContent = () => (
  <>
    <h2>LICO 거래소 거래규칙</h2>

    <div className="rules-article">
      <h3>제1조 (거래 대상)</h3>
      <ol>
        <li>거래소에서 거래할 수 있는 종목은 거래소가 상장을 승인한 주식에 한합니다.</li>
        <li>각 주식 종목에는 고유한 심볼(Symbol)이 부여되며, 이를 통해 식별됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제2조 (주문 유형)</h3>
      <p>거래소에서 지원하는 주문 유형은 다음과 같습니다.</p>
      <ol>
        <li><strong>지정가 주문</strong>: 회원이 지정한 가격으로 매수 또는 매도를 요청하는 주문</li>
        <li><strong>시장가 주문</strong>: 현재 시장 가격으로 즉시 체결을 요청하는 주문</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (가격제한폭)</h3>
      <ol>
        <li>각 주식 종목의 일일 가격 변동 폭은 전일 종가 대비 상하 30%로 제한됩니다.</li>
        <li>상한가 또는 하한가에 도달한 경우 해당 방향의 추가 주문은 제한될 수 있습니다.</li>
        <li>신규 상장 종목의 경우, 상장일에는 가격제한폭을 별도로 적용할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (거래 단위)</h3>
      <ol>
        <li>주식의 최소 거래 단위는 1주입니다.</li>
        <li>주문 가격의 최소 단위(호가 단위)는 종목별로 거래소가 별도로 정합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (거래 시간)</h3>
      <ol>
        <li>정규 거래 시간은 거래소가 별도로 정하여 공지합니다.</li>
        <li>거래소는 시장 상황에 따라 거래 시간을 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
        <li>시스템 점검 등의 사유로 거래가 일시 중단될 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제6조 (체결 원칙)</h3>
      <ol>
        <li><strong>가격 우선의 원칙</strong>: 매수 주문은 높은 가격, 매도 주문은 낮은 가격이 우선합니다.</li>
        <li><strong>시간 우선의 원칙</strong>: 동일 가격의 주문은 먼저 접수된 주문이 우선합니다.</li>
        <li>시장가 주문은 지정가 주문보다 우선하여 체결됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (주문의 취소 및 정정)</h3>
      <ol>
        <li>미체결 주문은 체결 전까지 취소 또는 정정할 수 있습니다.</li>
        <li>이미 체결된 주문은 취소 또는 정정할 수 없습니다.</li>
        <li>주문 취소 및 정정 시 기존 주문의 시간 우선 순위는 소멸됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제8조 (정산)</h3>
      <ol>
        <li>거래 체결 시 매수 대금은 회원의 지갑에서 즉시 차감되며, 매도 대금은 즉시 지갑에 입금됩니다.</li>
        <li>거래 수수료가 부과되는 경우, 수수료는 체결 시 자동으로 차감됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제9조 (이상 거래 감시)</h3>
      <ol>
        <li>거래소는 시세조종, 불공정거래 등 이상 거래를 상시 감시합니다.</li>
        <li>이상 거래가 의심되는 경우, 거래소는 해당 거래를 일시 중지하고 조사할 수 있습니다.</li>
        <li>조사 결과 불공정거래로 확인된 경우, 해당 거래를 취소하고 관련 회원에게 제재를 부과할 수 있습니다.</li>
      </ol>
    </div>
  </>
);

const ProhibitedContent = () => (
  <>
    <h2>금지행위 및 처벌규정</h2>

    <div className="rules-article">
      <h3>제1조 (금지행위)</h3>
      <p>다음 각 호의 행위는 거래소에서 엄격히 금지됩니다.</p>
      <ol>
        <li><strong>시세조종 행위</strong>: 인위적으로 주식의 가격을 변동시키거나 고정시키는 행위
          <ul>
            <li>허수 주문(Spoofing): 체결 의사 없이 대량 주문을 넣어 시세를 조작하는 행위</li>
            <li>통정매매: 사전에 합의하여 특정 가격에 매수·매도를 반복하는 행위</li>
            <li>가장매매: 동일인이 매수와 매도를 동시에 행하여 거래량을 조작하는 행위</li>
          </ul>
        </li>
        <li><strong>미공개정보 이용</strong>: 아직 공개되지 않은 중요 정보를 이용하여 거래하는 행위</li>
        <li><strong>허위주문</strong>: 체결 의사 없이 주문을 반복적으로 제출하고 취소하는 행위</li>
        <li><strong>자전거래</strong>: 자기 자신과의 거래를 통해 부당한 이익을 취하는 행위</li>
        <li><strong>시스템 악용</strong>: 거래소 시스템의 취약점을 악용하여 부당한 이익을 취하는 행위</li>
        <li><strong>다중 계정 악용</strong>: 여러 개의 계정을 이용하여 시세를 조종하거나 부당한 이익을 취하는 행위</li>
        <li><strong>타인 계정 사용</strong>: 타인의 계정을 무단으로 사용하거나 대리 거래하는 행위</li>
        <li><strong>허위 정보 유포</strong>: 주가에 영향을 미칠 수 있는 허위 정보를 유포하는 행위</li>
        <li><strong>서비스 방해</strong>: 거래소의 정상적인 운영을 방해하는 일체의 행위</li>
      </ol>
    </div>

    <hr className="rules-divider" />

    <div className="rules-article">
      <h3>제2조 (처벌 단계)</h3>
      <p>금지행위 적발 시 다음의 처벌 단계에 따라 제재가 부과됩니다.</p>
      <table className="rules-table">
        <thead>
          <tr>
            <th>단계</th>
            <th>제재 내용</th>
            <th>적용 기준</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>1단계 - 경고</strong></td>
            <td>서면 경고 및 주의 통보</td>
            <td>경미한 위반 1회 적발 시</td>
          </tr>
          <tr>
            <td><strong>2단계 - 거래 제한</strong></td>
            <td>7일간 거래 기능 정지</td>
            <td>경고 2회 누적 또는 중간 수준 위반 시</td>
          </tr>
          <tr>
            <td><strong>3단계 - 계정 정지</strong></td>
            <td>30일간 계정 정지 및 전 기능 이용 불가</td>
            <td>거래 제한 2회 누적 또는 중대 위반 시</td>
          </tr>
          <tr>
            <td><strong>4단계 - 영구 정지</strong></td>
            <td>계정 영구 정지 및 자산 동결</td>
            <td>계정 정지 후 재위반 또는 극심한 위반 시</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div className="rules-article">
      <h3>제3조 (부당이득 환수)</h3>
      <ol>
        <li>금지행위로 인해 취득한 부당이득은 전액 환수됩니다.</li>
        <li>부당이득의 산정이 곤란한 경우, 거래소는 합리적인 방법으로 이를 추정하여 환수할 수 있습니다.</li>
        <li>환수 대상 자산이 부족한 경우, 회원의 보유 자산에서 우선 차감됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (이의 신청)</h3>
      <ol>
        <li>제재를 받은 회원은 제재 통보일로부터 7일 이내에 이의를 신청할 수 있습니다.</li>
        <li>이의 신청은 서면(전자문서 포함)으로 하여야 하며, 구체적인 사유와 근거를 첨부해야 합니다.</li>
        <li>거래소는 이의 신청 접수일로부터 14일 이내에 심사 결과를 통보합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (신고 및 포상)</h3>
      <ol>
        <li>회원은 다른 회원의 금지행위를 발견한 경우 거래소에 신고할 수 있습니다.</li>
        <li>신고 내용이 사실로 확인된 경우, 거래소는 신고자에게 포상을 지급할 수 있습니다.</li>
      </ol>
    </div>
  </>
);

const PrivacyContent = () => (
  <>
    <h2>개인정보처리방침</h2>

    <div className="rules-article">
      <h3>제1조 (개인정보의 수집 항목)</h3>
      <p>거래소는 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
      <ol>
        <li><strong>필수 수집 항목</strong>: 마인크래프트 사용자명, 계정 ID, 지갑 주소, 거래 내역</li>
        <li><strong>자동 수집 항목</strong>: 접속 IP, 접속 시간, 브라우저 정보, 서비스 이용 기록</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제2조 (개인정보의 이용 목적)</h3>
      <p>수집된 개인정보는 다음의 목적으로 이용됩니다.</p>
      <ol>
        <li>회원 가입 및 관리: 회원 식별, 가입 의사 확인, 본인 확인</li>
        <li>서비스 제공: 주식 거래, 자산 관리, 입출금 처리</li>
        <li>서비스 개선: 서비스 이용 통계, 시스템 안정성 향상</li>
        <li>안전한 거래 환경 조성: 부정거래 탐지 및 방지, 분쟁 조정</li>
        <li>고지사항 전달: 서비스 변경, 약관 변경 등 중요 사항 안내</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (개인정보의 보유 및 이용 기간)</h3>
      <ol>
        <li>회원의 개인정보는 서비스 이용 기간 동안 보유하며, 회원 탈퇴 시 지체 없이 파기합니다.</li>
        <li>다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          <ul>
            <li>거래 기록: 5년 (전자상거래법)</li>
            <li>접속 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (개인정보의 제3자 제공)</h3>
      <ol>
        <li>거래소는 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다.</li>
        <li>다만, 다음의 경우에는 예외로 합니다.
          <ul>
            <li>회원이 사전에 동의한 경우</li>
            <li>법령에 의하여 제공이 요구되는 경우</li>
            <li>서비스 제공에 관한 계약 이행을 위해 필요한 경우</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (개인정보의 파기)</h3>
      <ol>
        <li>개인정보 보유 기간이 경과하거나 처리 목적이 달성된 경우, 해당 개인정보를 지체 없이 파기합니다.</li>
        <li>전자적 파일 형태의 정보는 복구 불가능한 방법으로 삭제합니다.</li>
        <li>종이 문서에 기록된 개인정보는 분쇄하거나 소각하여 파기합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제6조 (회원의 권리)</h3>
      <ol>
        <li>회원은 언제든지 자신의 개인정보에 대해 열람, 수정, 삭제를 요청할 수 있습니다.</li>
        <li>회원은 개인정보 처리에 대한 동의를 철회할 수 있으며, 이 경우 서비스 이용이 제한될 수 있습니다.</li>
        <li>거래소는 회원의 요청에 대해 지체 없이 필요한 조치를 취합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (개인정보의 안전성 확보 조치)</h3>
      <p>거래소는 개인정보의 안전성 확보를 위해 다음의 조치를 취하고 있습니다.</p>
      <ol>
        <li>개인정보의 암호화 저장 및 전송</li>
        <li>해킹 등에 대비한 보안 시스템 구축</li>
        <li>개인정보 접근 권한의 제한 및 관리</li>
        <li>개인정보 취급 직원의 최소화 및 교육</li>
      </ol>
    </div>
  </>
);

export default RulesPage;
