# Supabase SQL Editor에서 실행할 마이그레이션

아래 SQL을 Supabase Dashboard > SQL Editor에 붙여넣고 실행해주세요.

```sql
-- 1. 큐레이션 모델 정렬용 컬럼 추가
ALTER TABLE ai_models ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 999;

-- 2. 기존 모델 전부 비활성화 (새로 동기화할 예정)
UPDATE ai_models SET is_active = false;
```

실행 후 앱에서 **"OpenRouter 최신 모델 동기화"** 버튼을 누르면 큐레이션된 유명 모델들만 새로 채워집니다.

---

# README 스크린샷 추가 가이드

README에 사용할 스크린샷을 `docs/` 폴더에 넣어주세요:

1. **로그인 후 메모 페이지** -> `docs/memos.png`
2. **AI 채팅 페이지** -> `docs/chat.png`
3. **모바일 메모 화면** (크롬 DevTools 모바일 모드) -> `docs/mobile-memos.png`
4. **모바일 채팅 화면** -> `docs/mobile-chat.png`

촬영 방법: 크롬에서 `Cmd+Shift+P` > "Capture full size screenshot"
