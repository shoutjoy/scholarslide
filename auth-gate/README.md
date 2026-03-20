# ScholarSlide 인증 게이트 (`auth-gate`)

## 동작

- **최초 접속**: `index.html` 로드 시 `#app` 은 숨겨지고, 인증 오버레이가 표시됩니다.
- **인증번호**: 코드에는 **평문이 없고**, 올바른 번호의 **SHA-256(hex)** 만 조각으로 보관합니다. 입력값을 같은 방식으로 해시해 비교합니다.
- **성공 시**: `localStorage` 키 `ss_scholar_slide_auth_v1` 에 표시 저장 후 앱 표시.
- **API 키**: 인증과 별개로, **시작 시 Gemini API 키 모달은 자동으로 뜨지 않습니다.** 사용자가 🔑 또는 설정에서 입력합니다.

## 파일

| 파일 | 설명 |
|------|------|
| `auth-gate.css` | 인증 화면 스타일 |
| `auth-gate.js` | 해시 검증, Gmail(mailto) 신청, 오버레이 삽입 |
| `auth-gate.html` | 단독 테스트용 (선택) |

## 인증번호 변경 시

1. 새 비밀번호 문자열을 UTF-8 기준 SHA-256 으로 해시합니다.

   ```bash
   node -e "console.log(require('crypto').createHash('sha256').update('새비밀번호','utf8').digest('hex'))"
   ```

2. `auth-gate.js` 의 `HASH_HEX_PARTS` 를 8글자씩 잘라 배열로 넣고 `EXPECTED_HASH_HEX` 가 되도록 수정합니다.

## 보안 안내

클라이언트만으로는 **완전한 비밀 보호가 불가능**합니다. 해시만 두어도 오프라인 무차별 대입이 가능합니다. **생활 보안·내부 배포** 용도이며, 공개 배포 시에는 서버 측 인증을 권장합니다.

## 연락처(앱 내 표시)

- 개발자: 박중희 교수  
- 메일: `shoutjoy1@yonsei.ac.kr`  
- 인증 신청: 「메일 전송」→ 기본 메일 앱에서 위 주소로 본문이 채워짐 (Gmail 웹을 쓰는 경우 브라우저/Gmail 설정에 따라 동작이 다를 수 있음).
