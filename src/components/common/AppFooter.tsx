export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div>
          <strong>© 2026 학교 별도검사 운영 도우미. All rights reserved.</strong>
          <p>본 도구는 학교에서 직접 운영하는 결핵검진·소변검사 등 학교 별도검사 업무를 지원하기 위한 시스템입니다.</p>
          <p>학생 개인정보는 저장하지 않는 구조를 원칙으로 합니다.</p>
          <p>학생 이름, 학번, 검사 결과, 질병명 등 개인정보를 입력하지 않는 구조로 사용해 주세요.</p>
        </div>
        <div className="footer-meta">
          <span>제작: 쑤캥T</span>
          <span>용도: 학교 보건 업무 보조 도구</span>
          <span>개인정보 입력 금지 안내</span>
        </div>
      </div>
    </footer>
  );
}
