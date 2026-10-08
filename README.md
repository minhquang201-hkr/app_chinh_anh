<div align="center">

# 🎨 LuminaEdit — Trình Chỉnh Sửa & Xử Lý Ảnh Trực Tuyến Chuyên Nghiệp

<p align="center">
  <strong>Nền tảng xử lý pixel canvas thời gian thực, tối ưu hiệu năng đồ họa và lưu trữ lịch sử đa tầng.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/VERSION-v1.0.0-8A2BE2?style=for-the-badge&logo=semver&logoColor=white" alt="Version" />
  <img src="https://img.shields.io/badge/NEXT.JS-14.X-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/REACT-18.X-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TYPESCRIPT-5.X-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/FABRIC.JS-5.X%20%2F%206.X-FF6F61?style=for-the-badge&logo=html5&logoColor=white" alt="Fabric.js" />
  <img src="https://img.shields.io/badge/TAILWINDCSS-3.X-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/ZUSTAND-STATE-4338CA?style=for-the-badge&logo=redux&logoColor=white" alt="Zustand" />
  <img src="https://img.shields.io/badge/LICENSE-MIT-green?style=for-the-badge" alt="License" />
</p>

---

</div>

> **LuminaEdit** là giải pháp chỉnh sửa hình ảnh trực tiếp trên nền tảng web hiện đại. Ứng dụng kết hợp sức mạnh kết xuất đồ họa vector/raster của **Fabric.js Engine** cùng ma trận bộ lọc **WebGL/Canvas Convolution**, mang lại trải nghiệm tinh chỉnh độ sáng, độ nét và màu sắc mượt mà 60 FPS, đồng thời quản lý lịch sử ảnh cục bộ an toàn qua **IndexedDB**.

---

## 📑 Mục Lục

* [🌟 Tính Năng Nổi Bật](#-tính-năng-nổi-bật)
* [🏗️ Kiến Trúc Hệ Thống & Cấu Trúc Dự Án](#️-kiến-trúc-hệ-thống--cấu-trúc-dự-án)
* [🛠️ Công Nghệ Sử Dụng (Tech Stack)](#️-công-nghệ-sử-dụng-tech-stack)
* [⚡ Cài Đặt & Hướng Dẫn Khởi Chạy](#-cài-đặt--hướng-dẫn-khởi-chạy)
* [⌨️ Phím Tắt Thao Tác Nhanh](#️-phím-tắt-thao-tác-nhanh)
* [🛣️ Kế Hoạch Phát Triển (Roadmap)](#️-kế-hoạch-phát-triển-roadmap)
* [👤 Tác Giả & Bản Quyền](#-tác-giả--bản-quyền)

---

## 🌟 Tính Năng Nổi Bật

### 1. 🎛️ Bộ Tinh Chỉnh Thông Số Chuyên Sâu (Adjustments)
* **Độ Sáng (Brightness)** & **Độ Tương Phản (Contrast)**: Thuật toán cân chỉnh ánh sáng thời gian thực.
* **Độ Nét Cải Tiến (Sharpness Kernel)**: Áp dụng ma trận tích chập (*3x3 Convolution Matrix*) làm nổi bật chi tiết mà không gây vỡ hạt.
* **Độ Bão Hòa (Saturation)** & **Làm Mờ (Gaussian Blur)**: Tùy biến độ rực rỡ và độ mờ của từng khung hình.

### 2. 🎭 Bộ Lọc Màu Nghệ Thuật (Color Matrix Presets)
* Hỗ trợ 7+ preset màu chuẩn phòng lab: **Gốc (Normal)**, **Vintage Retro**, **Sepia Cổ Điển**, **Đen Trắng (Grayscale)**, **Tương Phản Cao (High Contrast B&W)**, **Tone Ấm (Warmth)**, và **Tone Lạnh (Cool Cinematic)**.

### 3. 🔄 Hệ Thống Undo / Redo & Quản Lý Lịch Sử
* Khôi phục từng bước chỉnh sửa với ngăn xếp lịch sử (**History Stack**).
* Lưu trữ phiên làm việc và danh sách ảnh vào **IndexedDB / LocalStorage** dung lượng cao, không lo mất dữ liệu khi tải lại trang.

### 4. 🔍 Điều Khiển Canvas Linh Hoạt
* **Zoom & Pan mượt mà**: Hỗ trợ cuộn chuột (*Mouse Wheel*) phóng to/thu nhỏ từ 20% đến 500% kèm nút **Fit 100%**.
* Hiển thị thông số metadata trực tiếp: Độ phân giải thực $(W \times H)$, dung lượng file và định dạng.

### 5. 📤 Xuất Ảnh Độ Phân Giải Gốc (Ultra-HQ Export)
* Xuất file định dạng **PNG**, **JPG**, **WebP** với chất lượng tùy biến (lên tới 100% resolution gốc) mà không bị suy giảm chất lượng bởi kích thước hiển thị màn hình.

---

## 🏗️ Kiến Trúc Hệ Thống & Cấu Trúc Dự Án

```text
app_chinh_anh/
├── .agents/                 # Antigravity Rules & Custom Skills (Code-Reviewer, Auto-Git)
├── public/                  # Tài nguyên tĩnh, icon và ảnh demo
├── src/
│   ├── app/                 # Next.js App Router (Layouts, Pages)
│   │   ├── layout.tsx       # Root Layout
│   │   └── page.tsx         # Trang chỉnh ảnh chính
│   ├── components/
│   │   └── editor/
│   │       ├── CanvasViewport.tsx      # Viewport trung tâm chứa Fabric Canvas
│   │       ├── Dropzone.tsx            # Vùng kéo thả tải ảnh
│   │       ├── HeaderNav.tsx           # Thanh công cụ Top (Undo, Redo, Export)
│   │       └── Sidebar/
│   │           ├── SidebarContainer.tsx# Khung tab chuyển đổi công cụ
│   │           ├── AdjustPanel.tsx     # Bảng điều khiển Sliders
│   │           └── FilterPanel.tsx     # Bảng chọn Preset màu
│   ├── hooks/
│   │   └── useFabric.ts     # Hook điều khiển Canvas, Filter Engine & Zoom/Pan
│   ├── stores/
│   │   └── useEditorStore.ts# Quản lý State toàn cục bằng Zustand
│   └── types/
│       └── editor.ts        # Type Definitions & Interfaces
├── js/                      # Source JavaScript thuần (Vanilla version)
│   ├── app.js               # Logic điều phối chính
│   ├── imageProcessor.js    # Pixel Processing Engine
│   ├── ui.js                # Quản lý giao diện DOM
│   ├── history.js           # Quản lý IndexedDB / Lịch sử ảnh
│   └── auth.js              # Quản lý trạng thái người dùng
├── index.html               # Trang ứng dụng chạy trực tiếp
├── style.css                # Bộ stylesheet giao diện cao cấp
└── README.md
```

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ / Thư viện | Vai trò |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 / React 18 | Cấu trúc ứng dụng hiện đại, Client-side Rendering tối ưu |
| **Canvas Engine** | Fabric.js | Điều khiển Layer, Đối tượng vector/raster, WebGL Filter backend |
| **State Manager** | Zustand | Quản lý trạng thái canvas, công cụ, undo/redo cực nhẹ |
| **Styling** | TailwindCSS + Vanilla CSS | Giao diện Dark Mode cao cấp, Glassmorphism, Micro-animations |
| **Storage** | IndexedDB / LocalStorage | Lưu cache ảnh độ phân giải cao và snapshot lịch sử |
| **Typography** | Plus Jakarta Sans | Font chữ công thái học hiện đại |

---

## ⚡ Cài Đặt & Hướng Dẫn Khởi Chạy

### 1. Chạy phiên bản Trực tiếp (Standalone Web):
Mở trực tiếp file [`index.html`](file:///d:/codegym/app%20ch%E1%BB%89nh%20%E1%BA%A3nh/index.html) bằng trình duyệt hoặc sử dụng Live Server trên VS Code / IDE.

### 2. Chạy phiên bản Next.js / TypeScript:
```bash
# 1. Cài đặt các gói phụ thuộc
npm install

# 2. Chạy môi trường phát triển (Dev server)
npm run dev
```
Truy cập ứng dụng tại: `http://localhost:3000`

---

## ⌨️ Phím Tắt Thao Tác Nhanh

| Phím tắt | Thao tác |
| :--- | :--- |
| `Ctrl + Z` / `Cmd + Z` | Hoàn tác bước trước (**Undo**) |
| `Ctrl + Y` / `Cmd + Shift + Z` | Làm lại bước sau (**Redo**) |
| `Mouse Wheel` | Phóng to / Thu nhỏ vùng vẽ (**Zoom In/Out**) |
| `Space + Kéo chuột` | Di chuyển khung nhìn Canvas (**Pan Viewport**) |
| `Delete` / `Backspace` | Xóa đối tượng/layer đang chọn |

---

## 🛣️ Kế Hoạch Phát Triển (Roadmap)

- [x] Hệ thống xử lý pixel độ sáng, độ nét ma trận tích chập và bộ lọc màu.
- [x] Quản lý Undo / Redo & Export đa định dạng.
- [x] Cấu trúc Next.js + TailwindCSS + Fabric.js Modular Hook.
- [ ] Công cụ cắt xén (Crop Freeform & Aspect Ratio 1:1, 16:9, 4:3).
- [ ] Thêm văn bản (Typography), Sticker và Watermark bản quyền.
- [ ] Tích hợp tính năng AI: Tách nền tự động (Background Remover) & Tăng nét AI (Super Resolution).

---

## 👤 Tác Giả & Bản Quyền

* **Tác giả**: [Hoang Ngoc Minh Quang](https://github.com/minhquang201-hkr)
* **GitHub Repository**: [https://github.com/minhquang201-hkr/app_chinh_anh](https://github.com/minhquang201-hkr/app_chinh_anh)
* **Email liên hệ**: `hoangngocminhquang20012005@gmail.com`

---

<div align="center">
  <sub>Phát triển với ❤️ bởi Minh Quang. Hãy nhấn ⭐ trên GitHub nếu bạn thấy dự án hữu ích!</sub>
</div>
