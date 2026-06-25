# Risks & Mitigations — The5ers Dashboard

## 🚨 1. Terms of Service Violation

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **ToS cấm scraping** | ⚠️ Medium | The5ers có thể cấm tự động truy cập trong ToS. |
| **Không bypass bảo vệ** | ✅ Mitigated | Script chỉ đọc DOM sau login thủ công — không bypass captcha, Cloudflare, cookie. |
| **Read-only** | ✅ Mitigated | Không POST/PUT/DELETE, không bấm submit. Chỉ đọc dữ liệu đang hiển thị. |

**Mitigation**: Không public repo, không share script. Chạy local, không automation login.

## 🔐 2. Session & Auth

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **Session hết hạn** | ⚠️ Medium | Token/session có TTL, cần relogin. Script sẽ detect và báo. |
| **2FA / Captcha** | ✅ By Design | Không bypass. User login thủ công → mọi xác thực tự xử lý. |

**Mitigation**: Script kiểm tra session health trước mỗi lần scrape. Nếu hết hạn → báo user login lại.

## 🎨 3. UI Layout Changes

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **Selector hỏng** | 🔴 High | Hub là SPA được update thường xuyên. Class name, DOM structure có thể đổi bất kỳ lúc nào. |
| **Data field ẩn/mất** | 🔴 High | Có thể dashboard mới không hiển thị drawdown, hoặc thay đổi format số. |
| **Feature A/B test** | ⚠️ Medium | Hub có thể A/B test UI, A thấy khác B. |

**Mitigation**: 
- Dùng text content + data-attributes thay vì class name cứng.
- Validate data shape sau mỗi scrape — nếu null/undefined thì báo field không tìm thấy.
- Maintain selector map, dễ update.

## 📉 4. Missing Data & Export Limits

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **Hub không hiển thị đủ field** | 🟡 Low-Medium | Như drawdown limit, daily P&L chart có thể không available. |
| **Không có trading history export** | 🟡 Medium | Hub có thể không cho xem lịch sử trades, hoặc chỉ hiển thị N trades gần nhất. |
| **Pagination** | 🟡 Medium | Danh sách accounts có thể phân trang, cần handle. |
| **Data format** | ✅ By Design | Dùng heuristic parse + fallback. Số có dấu phẩy (1,234.56 → 1234.56), % values nguyên/thập phân. |

**Mitigation**: Schema design cho phép field optional (`?`). Dashboard hiển thị "N/A" cho field không có.

## ⚡ 5. Performance

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **Nhiều account → chậm** | 🟡 Low | Nếu có 20+ accounts, mỗi account vào detail trang mất ~2-3s. |
| **Rate limit** | ⚠️ Medium | Hub có thể rate limit request nếu scrape quá nhanh. |

**Mitigation**: Delay giữa các page load (1-2s). Dùng concurrent có giới hạn.

## 🔐 6. Security

| Risk | Mức độ | Giải thích |
|------|--------|------------|
| **Exposed credentials** | ✅ Mitigated | Không lưu credentials. Browser profile riêng để không ảnh hưởng session chính. |
| **Data at rest** | 🟡 Low | JSON chứa balance/P&L — nếu máy bị compromised thì lộ. |

**Mitigation**: Dùng browser context riêng. Không commit `data/` lên git (gitignore).

## 📋 Tổng kết

| Hạng mục | Trạng thái |
|----------|-----------|
| Không bypass auth / captcha | ✅ |
| Không ghi credentials | ✅ |
| Read-only (không POST) | ✅ |
| Handle UI thay đổi | ⚠️ Cần maintain |
| Handle missing data | ✅ Optional fields |
| Public deploy không chứa live data | ⚠️ Dashboard deploy static với dummy/sample data |
