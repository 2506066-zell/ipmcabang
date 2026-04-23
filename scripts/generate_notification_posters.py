from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "app" / "media" / "notifications"
LOGO_PATH = ROOT / "app" / "media" / "brand" / "ipm-logo.png"
FONT_REGULAR = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FONT_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

CARD_COPY = {
    "reminder-home.png": {
        "eyebrow": "Reminder Harian",
        "title": "Aktivitas IPM Malam Ini",
        "subtitle": "Cek info organisasi, artikel, quiz, dan agenda terbaru dalam satu aplikasi resmi."
    },
    "reminder-quiz.png": {
        "eyebrow": "Quiz Aktif",
        "title": "Waktunya Lanjut Quiz",
        "subtitle": "Buka halaman quiz dan lanjutkan tantangan malam ini dengan tampilan yang sudah kamu kenal."
    },
    "reminder-forms.png": {
        "eyebrow": "Form Siap Diisi",
        "title": "Pretest dan Posttest Menunggu",
        "subtitle": "Masuk ke halaman form untuk mengisi agenda yang sudah dibuka sistem malam ini."
    },
    "reminder-attendance.png": {
        "eyebrow": "Absensi Aktif",
        "title": "Pastikan Kehadiran Tercatat",
        "subtitle": "Cek room absensi yang masih berjalan dan konfirmasi status kehadiranmu malam ini."
    },
    "reminder-materials.png": {
        "eyebrow": "Perpustakaan Digital",
        "title": "Lanjutkan Bacaan Malam Ini",
        "subtitle": "Masuk ke halaman perpustakaan untuk membaca materi pilihan dengan suasana yang lebih fokus."
    },
    "reminder-discussions.png": {
        "eyebrow": "Diskusi Terbaru",
        "title": "Ada Percakapan yang Menarik",
        "subtitle": "Buka ruang diskusi resmi dan ikut menanggapi topik yang sedang ramai dibahas."
    },
}


def rounded_rectangle(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def wrap_text(draw, text, font, max_width):
    words = text.split()
    lines = []
    current = []
    for word in words:
        candidate = " ".join(current + [word])
        if draw.textlength(candidate, font=font) <= max_width:
            current.append(word)
            continue
        if current:
            lines.append(" ".join(current))
        current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def draw_gradient_overlay(base, top_color, bottom_color):
    width, height = base.size
    gradient = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    pixels = gradient.load()
    for y in range(height):
        ratio = y / max(1, height - 1)
        r = int(top_color[0] * (1 - ratio) + bottom_color[0] * ratio)
        g = int(top_color[1] * (1 - ratio) + bottom_color[1] * ratio)
        b = int(top_color[2] * (1 - ratio) + bottom_color[2] * ratio)
        a = int(top_color[3] * (1 - ratio) + bottom_color[3] * ratio)
        for x in range(width):
            pixels[x, y] = (r, g, b, a)
    return Image.alpha_composite(base, gradient)


def build_poster(path):
    source = Image.open(path).convert("RGBA")
    canvas = Image.new("RGBA", source.size, (8, 18, 24, 255))

    cover = Image.new("RGBA", source.size)
    resized = source.resize((1320, 693))
    cover.paste(resized, (-60, -25))
    cover = cover.filter(ImageFilter.GaussianBlur(0.6))
    canvas = Image.alpha_composite(canvas, cover)
    canvas = draw_gradient_overlay(
        canvas,
        (5, 26, 37, 64),
        (4, 16, 24, 205),
    )

    accent = Image.new("RGBA", source.size, (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent)
    accent_draw.ellipse((860, -120, 1320, 320), fill=(252, 203, 62, 52))
    accent_draw.ellipse((-150, 350, 380, 760), fill=(18, 111, 88, 90))
    accent = accent.filter(ImageFilter.GaussianBlur(55))
    canvas = Image.alpha_composite(canvas, accent)

    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(FONT_BOLD, 60)
    subtitle_font = ImageFont.truetype(FONT_REGULAR, 24)
    eyebrow_font = ImageFont.truetype(FONT_BOLD, 20)
    source_font = ImageFont.truetype(FONT_REGULAR, 18)
    source_bold = ImageFont.truetype(FONT_BOLD, 22)

    copy = CARD_COPY[path.name]

    rounded_rectangle(
        draw,
        (56, 46, 1138, 584),
        radius=34,
        fill=(7, 20, 29, 116),
        outline=(255, 255, 255, 30),
        width=2,
    )
    rounded_rectangle(draw, (76, 76, 280, 124), radius=24, fill=(243, 195, 56, 235))
    draw.text((108, 90), copy["eyebrow"], font=eyebrow_font, fill=(21, 37, 31, 255))

    title_lines = wrap_text(draw, copy["title"], title_font, 760)
    title_y = 176
    for line in title_lines:
        draw.text((84, title_y), line, font=title_font, fill=(255, 255, 255, 255))
        title_y += 70

    subtitle_lines = wrap_text(draw, copy["subtitle"], subtitle_font, 760)
    subtitle_y = title_y + 10
    for line in subtitle_lines:
        draw.text((86, subtitle_y), line, font=subtitle_font, fill=(229, 238, 241, 235))
        subtitle_y += 34

    draw.line((86, 472, 220, 472), fill=(243, 195, 56, 255), width=5)
    draw.text((86, 490), "Sumber resmi PC IPM Panawuan", font=source_bold, fill=(255, 255, 255, 248))
    draw.text((86, 524), "Otomatis dari sistem reminder harian aplikasi", font=source_font, fill=(205, 222, 228, 230))

    logo = Image.open(LOGO_PATH).convert("RGBA")
    logo.thumbnail((132, 132))
    logo_box = Image.new("RGBA", (170, 170), (0, 0, 0, 0))
    logo_draw = ImageDraw.Draw(logo_box)
    rounded_rectangle(logo_draw, (0, 0, 170, 170), radius=40, fill=(255, 255, 255, 214))
    logo_box.alpha_composite(logo, ((170 - logo.width) // 2, (170 - logo.height) // 2 - 4))
    canvas.alpha_composite(logo_box, (966, 64))

    footer_box = Image.new("RGBA", (320, 58), (0, 0, 0, 0))
    footer_draw = ImageDraw.Draw(footer_box)
    rounded_rectangle(footer_draw, (0, 0, 320, 58), radius=24, fill=(8, 21, 30, 188), outline=(255, 255, 255, 34))
    footer_draw.text((26, 18), "Percaya. Resmi. Relevan.", font=source_font, fill=(255, 255, 255, 242))
    canvas.alpha_composite(footer_box, (806, 542))

    canvas.convert("RGB").save(path, quality=94)


def main():
    for filename in CARD_COPY:
        build_poster(ASSET_DIR / filename)
    print(f"Generated {len(CARD_COPY)} notification posters in {ASSET_DIR}")


if __name__ == "__main__":
    main()
