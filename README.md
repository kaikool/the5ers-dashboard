# The5ers Dashboard

Dashboard cá nhân cho tài khoản The5ers.

## Cách setup (1 lần duy nhất)

### 1. Export cookies
```bash
# Trên Chrome đã login hub.the5ers.com:
# - Cài extension Cookie-Editor
# - Vào hub.the5ers.com → bấm Cookie-Editor → Export
# - Copy JSON → lưu vào scraper/cookies.json
```

### 2. Push lên GitHub private repo
```bash
git init && git add .
git commit -m "init"
# Tạo repo private trên GitHub
git remote add origin https://github.com/<user>/the5ers-dashboard.git
git push -u origin main
```

### 3. Thêm GitHub Secrets
Vào GitHub repo → Settings → Secrets and variables → Actions → New:

| Secret | Giá trị |
|--------|---------|
| `THE5ERS_COOKIES` | Nội dung file cookies.json (export bước 1) |

### 4. Deploy Vercel
```bash
npm i -g vercel
cd dashboard
vercel --prod
```
Lấy `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` rồi thêm vào GitHub Secrets.

### 5. Xong!
Workflow tự động chạy mỗi sáng 8h.

**Cookies hết hạn ~1 tháng** (DSR hết 23/07/2026). Khi nào thấy workflow fail vì 401, export lại cookies và update GitHub Secret.
