export function AppFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div>
          <strong>© 2026 쑤캥T 보건실 도구모음. All rights reserved.</strong>
          <p>본 도구는 보건교사의 검진·검사 시간표 작성 업무를 돕기 위한 공유용 Lite 도구입니다.</p>
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
