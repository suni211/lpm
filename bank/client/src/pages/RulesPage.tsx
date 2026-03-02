import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import './RulesPage.css';

type TabType = 'terms' | 'banking' | 'prohibited' | 'privacy';

const RulesPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'terms';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  const tabs: { key: TabType; label: string }[] = [
    { key: 'terms', label: '이용약관' },
    { key: 'banking', label: '금융거래규칙' },
    { key: 'prohibited', label: '금지행위 및 처벌' },
    { key: 'privacy', label: '개인정보처리방침' },
  ];

  return (
    <>
      <Sidebar userData={null} />
      <div className="rules-page">
        <div className="rules-container">
          <div className="rules-header">
            <h1>CRYPBANK 이용관리규칙</h1>
            <p className="rules-subtitle">CRYPBANK의 이용약관 및 관리규칙을 안내합니다.</p>
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
            {activeTab === 'banking' && <BankingRulesContent />}
            {activeTab === 'prohibited' && <ProhibitedContent />}
            {activeTab === 'privacy' && <PrivacyContent />}
          </div>
        </div>
      </div>
    </>
  );
};

const TermsContent = () => (
  <>
    <h2>CRYPBANK 이용약관</h2>

    <div className="rules-article">
      <h3>제1조 (목적)</h3>
      <p>
        본 약관은 CRYPBANK(이하 "은행")가 제공하는 온라인 금융 서비스 및 관련 제반 서비스(이하 "서비스")의
        이용에 관한 조건 및 절차, 은행과 회원 간의 권리·의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
      </p>
    </div>

    <div className="rules-article">
      <h3>제2조 (용어의 정의)</h3>
      <p>본 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
      <ol>
        <li><strong>"은행"</strong>이란 CRYPBANK가 운영하는 온라인 금융 플랫폼을 말합니다.</li>
        <li><strong>"회원"</strong>이란 본 약관에 동의하고 은행에 계정을 등록한 자를 말합니다.</li>
        <li><strong>"계좌"</strong>란 회원의 자산을 관리하기 위해 개설된 금융 계좌를 말합니다.</li>
        <li><strong>"이체"</strong>란 회원의 계좌에서 다른 계좌로 자금을 이동하는 행위를 말합니다.</li>
        <li><strong>"입금"</strong>이란 외부로부터 회원의 계좌에 자금이 유입되는 것을 말합니다.</li>
        <li><strong>"출금"</strong>이란 회원의 계좌에서 외부로 자금이 유출되는 것을 말합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (약관의 효력 및 변경)</h3>
      <ol>
        <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
        <li>은행은 관련 법령에 위배되지 않는 범위에서 본 약관을 변경할 수 있으며, 변경 시 적용일 7일 전부터 공지합니다.</li>
        <li>회원이 변경된 약관에 동의하지 않는 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (이용계약의 성립)</h3>
      <ol>
        <li>이용계약은 회원이 되고자 하는 자가 본 약관에 동의하고 가입 신청을 한 후, 은행이 이를 승낙함으로써 성립합니다.</li>
        <li>회원 가입 시 마인크래프트 계정 인증이 필수적으로 요구됩니다.</li>
        <li>금융 서비스 이용을 위해 별도의 계좌 개설 절차를 완료해야 합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (서비스의 내용)</h3>
      <p>은행이 제공하는 서비스는 다음 각 호와 같습니다.</p>
      <ol>
        <li>계좌 개설 및 관리 서비스</li>
        <li>입금 및 출금 서비스</li>
        <li>계좌 간 이체 서비스</li>
        <li>자동 이체 및 예약 이체 서비스</li>
        <li>예산 관리 서비스</li>
        <li>목표 저축 서비스</li>
        <li>LICO 거래소 연동 서비스</li>
        <li>거래 내역 조회 및 통계 서비스</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제6조 (회원의 의무)</h3>
      <ol>
        <li>회원은 관계 법령, 본 약관의 규정, 이용안내 및 서비스와 관련하여 공지한 사항을 준수하여야 합니다.</li>
        <li>회원은 자신의 계정 정보 및 계좌 정보를 안전하게 관리할 의무가 있으며, 이를 제3자에게 양도하거나 대여할 수 없습니다.</li>
        <li>회원은 거래에 사용되는 비밀번호를 정기적으로 변경하고 안전하게 보관해야 합니다.</li>
        <li>회원은 서비스 이용 시 허위 정보를 제공하거나 타인의 정보를 도용하여서는 안 됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (서비스 이용의 제한 및 중지)</h3>
      <ol>
        <li>은행은 시스템 점검, 교체 및 고장, 통신 두절 등의 사유가 발생한 경우 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
        <li>은행은 회원이 본 약관 또는 관련 규정을 위반한 경우 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.</li>
        <li>은행은 서비스 이용 제한 시 그 사유 및 기간을 회원에게 통지합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제8조 (면책조항)</h3>
      <ol>
        <li>은행은 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 인한 서비스 제공 불능에 대해 책임을 지지 않습니다.</li>
        <li>은행은 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</li>
        <li>은행은 회원이 서비스를 통해 기대하는 수익의 실현이나 손실 방지에 대해 보장하지 않습니다.</li>
      </ol>
    </div>
  </>
);

const BankingRulesContent = () => (
  <>
    <h2>CRYPBANK 금융거래규칙</h2>

    <div className="rules-article">
      <h3>제1조 (계좌 개설)</h3>
      <ol>
        <li>회원은 은행에 1개 이상의 계좌를 개설할 수 있습니다.</li>
        <li>계좌 개설 시 고유한 계좌번호가 자동으로 부여됩니다.</li>
        <li>계좌의 종류 및 개설 가능 수는 은행이 별도로 정합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제2조 (입금 규칙)</h3>
      <ol>
        <li>입금은 은행이 정한 절차에 따라 처리됩니다.</li>
        <li>입금 요청은 관리자의 승인을 거쳐 처리될 수 있습니다.</li>
        <li>최소 입금 금액 및 1일 입금 한도는 은행이 별도로 정합니다.</li>
        <li>입금 처리 후 취소는 원칙적으로 불가합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (출금 규칙)</h3>
      <ol>
        <li>출금은 회원 본인의 요청에 의해서만 처리됩니다.</li>
        <li>출금 요청 시 계좌 잔액을 초과하는 금액은 출금할 수 없습니다.</li>
        <li>1일 출금 한도는 은행이 별도로 정하며, 한도 초과 시 추가 인증이 필요할 수 있습니다.</li>
        <li>출금 요청은 관리자의 승인을 거쳐 처리될 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (이체 규칙)</h3>
      <ol>
        <li>이체는 회원의 계좌에서 다른 회원의 계좌로 자금을 이동하는 것을 말합니다.</li>
        <li>이체 시 정확한 수신 계좌번호를 입력해야 하며, 잘못된 이체에 대한 책임은 회원에게 있습니다.</li>
        <li>1회 이체 한도 및 1일 이체 한도는 은행이 별도로 정합니다.</li>
        <li>이체 완료 후 취소는 수신자의 동의 없이는 불가합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (자동 이체)</h3>
      <ol>
        <li>회원은 정기적인 이체를 위해 자동 이체를 설정할 수 있습니다.</li>
        <li>자동 이체는 설정된 주기(일별/주별/월별)에 따라 자동으로 실행됩니다.</li>
        <li>자동 이체 실행 시 잔액이 부족한 경우 이체가 실패하며, 회원에게 통지됩니다.</li>
        <li>회원은 언제든지 자동 이체를 수정하거나 해지할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제6조 (예약 이체)</h3>
      <ol>
        <li>회원은 특정 날짜에 실행될 이체를 예약할 수 있습니다.</li>
        <li>예약 이체는 지정된 날짜에 자동으로 실행됩니다.</li>
        <li>예약 실행 시점에 잔액이 부족한 경우 이체가 실패합니다.</li>
        <li>예약 이체는 실행 전까지 취소할 수 있습니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (이자 규정)</h3>
      <ol>
        <li>계좌의 이자율은 은행이 별도로 정하여 공지합니다.</li>
        <li>이자는 일별로 계산되며, 정해진 주기에 따라 지급됩니다.</li>
        <li>은행은 시장 상황에 따라 이자율을 변경할 수 있으며, 변경 시 사전에 공지합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제8조 (계좌 관리)</h3>
      <ol>
        <li>장기간(90일 이상) 거래가 없는 계좌는 휴면계좌로 전환될 수 있습니다.</li>
        <li>휴면계좌의 자금은 별도 관리되며, 회원의 요청 시 복구됩니다.</li>
        <li>계좌 해지 시 잔액은 회원이 지정한 방법으로 반환됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제9조 (LICO 거래소 연동)</h3>
      <ol>
        <li>회원은 CRYPBANK 계좌와 LICO 거래소 지갑을 연동할 수 있습니다.</li>
        <li>연동 시 CRYPBANK 계좌와 LICO 지갑 간 자금 이동이 가능합니다.</li>
        <li>연동 서비스 이용 시 별도의 수수료가 부과될 수 있습니다.</li>
      </ol>
    </div>
  </>
);

const ProhibitedContent = () => (
  <>
    <h2>금지행위 및 처벌규정</h2>

    <div className="rules-article">
      <h3>제1조 (금지행위)</h3>
      <p>다음 각 호의 행위는 은행에서 엄격히 금지됩니다.</p>
      <ol>
        <li><strong>사기 행위</strong>: 허위 정보를 이용하여 부당한 금전적 이득을 취하는 행위
          <ul>
            <li>허위 입금 요청: 실제 입금 없이 입금을 주장하는 행위</li>
            <li>허위 출금 사유: 거짓된 사유로 긴급 출금을 요청하는 행위</li>
          </ul>
        </li>
        <li><strong>자금세탁</strong>: 불법으로 취득한 자금의 출처를 은닉하기 위해 은행 서비스를 이용하는 행위</li>
        <li><strong>불법 거래</strong>: 은행 서비스를 이용하여 불법적인 거래를 수행하는 행위</li>
        <li><strong>타인 명의 사용</strong>: 타인의 계정이나 계좌를 무단으로 사용하거나 대리 거래하는 행위</li>
        <li><strong>다중 계정 악용</strong>: 여러 개의 계정을 이용하여 이벤트, 혜택 등을 부당하게 수령하는 행위</li>
        <li><strong>시스템 악용</strong>: 은행 시스템의 취약점을 악용하여 부당한 이익을 취하는 행위</li>
        <li><strong>허위 정보 제공</strong>: 가입, 거래 등에 허위 정보를 제공하는 행위</li>
        <li><strong>서비스 방해</strong>: 은행의 정상적인 운영을 방해하는 일체의 행위</li>
        <li><strong>이체 사기</strong>: 타인을 기망하여 자신의 계좌로 이체하게 하는 행위</li>
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
            <td>7일간 입출금 및 이체 기능 정지</td>
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
        <li>부당이득의 산정이 곤란한 경우, 은행은 합리적인 방법으로 이를 추정하여 환수할 수 있습니다.</li>
        <li>환수 대상 자산이 부족한 경우, 회원의 보유 자산에서 우선 차감됩니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (이의 신청)</h3>
      <ol>
        <li>제재를 받은 회원은 제재 통보일로부터 7일 이내에 이의를 신청할 수 있습니다.</li>
        <li>이의 신청은 서면(전자문서 포함)으로 하여야 하며, 구체적인 사유와 근거를 첨부해야 합니다.</li>
        <li>은행은 이의 신청 접수일로부터 14일 이내에 심사 결과를 통보합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제5조 (신고 및 포상)</h3>
      <ol>
        <li>회원은 다른 회원의 금지행위를 발견한 경우 은행에 신고할 수 있습니다.</li>
        <li>신고 내용이 사실로 확인된 경우, 은행은 신고자에게 포상을 지급할 수 있습니다.</li>
      </ol>
    </div>
  </>
);

const PrivacyContent = () => (
  <>
    <h2>개인정보처리방침</h2>

    <div className="rules-article">
      <h3>제1조 (개인정보의 수집 항목)</h3>
      <p>은행은 서비스 제공을 위해 다음의 개인정보를 수집합니다.</p>
      <ol>
        <li><strong>필수 수집 항목</strong>: 마인크래프트 사용자명, 계정 ID, 계좌번호, 거래 내역</li>
        <li><strong>자동 수집 항목</strong>: 접속 IP, 접속 시간, 브라우저 정보, 서비스 이용 기록</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제2조 (개인정보의 이용 목적)</h3>
      <p>수집된 개인정보는 다음의 목적으로 이용됩니다.</p>
      <ol>
        <li>회원 가입 및 관리: 회원 식별, 가입 의사 확인, 본인 확인</li>
        <li>금융 서비스 제공: 계좌 관리, 입출금, 이체, 자동이체 처리</li>
        <li>서비스 개선: 서비스 이용 통계, 시스템 안정성 향상</li>
        <li>안전한 금융 환경 조성: 사기 거래 탐지 및 방지, 분쟁 조정</li>
        <li>고지사항 전달: 서비스 변경, 약관 변경 등 중요 사항 안내</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제3조 (개인정보의 보유 및 이용 기간)</h3>
      <ol>
        <li>회원의 개인정보는 서비스 이용 기간 동안 보유하며, 회원 탈퇴 시 지체 없이 파기합니다.</li>
        <li>다만, 관련 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.
          <ul>
            <li>금융 거래 기록: 5년 (전자금융거래법)</li>
            <li>접속 기록: 3개월 (통신비밀보호법)</li>
          </ul>
        </li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제4조 (개인정보의 제3자 제공)</h3>
      <ol>
        <li>은행은 원칙적으로 회원의 개인정보를 제3자에게 제공하지 않습니다.</li>
        <li>다만, 다음의 경우에는 예외로 합니다.
          <ul>
            <li>회원이 사전에 동의한 경우</li>
            <li>법령에 의하여 제공이 요구되는 경우</li>
            <li>LICO 거래소 연동 서비스 이용 시 필요한 최소 정보 (회원 동의 하에)</li>
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
        <li>은행은 회원의 요청에 대해 지체 없이 필요한 조치를 취합니다.</li>
      </ol>
    </div>

    <div className="rules-article">
      <h3>제7조 (개인정보의 안전성 확보 조치)</h3>
      <p>은행은 개인정보의 안전성 확보를 위해 다음의 조치를 취하고 있습니다.</p>
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
