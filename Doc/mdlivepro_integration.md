# mdlivepro 연동 프로토콜 (ScholarSlide → mdlivepro)

ScholarSlide 요약 새창보기에서 "mdlivepro 새파일" 버튼 클릭 시, mdlivepro가 수신해야 하는 postMessage 프로토콜입니다.

## 1. mdpro_password (비밀번호 전달)

ScholarSlide가 mdlivepro 창을 연 직후, 로그인 화면에 비밀번호를 자동 입력하기 위해 전송합니다.

```javascript
// mdlivepro에서 수신 예시
window.addEventListener('message', (e) => {
  if (e.data?.type === 'mdpro_password' && e.data?.password) {
    const pwd = e.data.password;
    // 로그인 폼 비밀번호 입력란에 pwd 넣고 제출
    const input = document.querySelector('input[type="password"]'); // 또는 해당 셀렉터
    if (input) {
      input.value = pwd;
      input.form?.submit(); // 또는 로그인 버튼 클릭
    }
  }
});
```

- **전송 시점**: 창 오픈 후 약 600ms 간격으로 최대 8초 동안 반복 전송
- **페이로드**: `{ type: 'mdpro_password', password: string }`

## 2. mdpro_ready (에디터 준비 신호)

mdlivepro가 로그인 완료 후 에디터가 준비되면, opener(ScholarSlide)에게 전송합니다.

```javascript
// mdlivepro에서 전송 (기존 구현 유지)
if (window.opener && !window.opener.closed) {
  window.opener.postMessage({ type: 'mdpro_ready' }, '*');
}
```

## 3. mdpro_document (콘텐츠 수신)

ScholarSlide가 `mdpro_ready`를 받으면, 새 탭에 넣을 문서를 전송합니다.

- **페이로드**: `{ type: 'mdpro_document', title?: string, content: string }`
- **title**: 새 탭 제목. 생략 시 "ScholarSlide 문서"
- **content**: 새 탭에 넣을 마크다운. `"From ScholarSlide\n\n"` 접두사 + 마크다운 헤딩(###) 변환된 요약

## 전체 흐름

1. 사용자가 ScholarSlide에서 "mdlivepro 새파일" 클릭
2. ScholarSlide: `prompt("mdlivepro 비밀번호를 입력하세요")` → 비밀번호 수집
3. ScholarSlide: mdlivepro.vercel.app 새 창 오픈
4. ScholarSlide: `mdpro_password` 반복 전송 (600ms 간격, 8초간)
5. mdlivepro: `mdpro_password` 수신 → 로그인 폼에 비밀번호 입력 후 제출
6. mdlivepro: 로그인 완료, 에디터 로드 → `mdpro_ready` 전송
7. ScholarSlide: `mdpro_ready` 수신 → `mdpro_document` 전송
8. mdlivepro: `mdpro_document` 수신 → TM.newTab(title, content, 'md')로 새 탭 생성 후 콘텐츠 표시
