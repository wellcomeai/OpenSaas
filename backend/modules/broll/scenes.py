"""Реестр сцен B-roll и сборка ffmpeg-команд.

Каждая команда — полный список аргументов ffmpeg (от "ffmpeg" до
output_path), вызывается через subprocess списком, НИКОГДА не shell=True.

Все сцены: 1080x1920, 30fps, yuv420p, длительность = params.duration,
с обязательными -y и -loglevel error.
"""
from __future__ import annotations

from typing import Callable

from modules.broll.schemas import SceneKey, SceneParams

W, H, FPS = 1080, 1920, 30


def _hx(color: str) -> str:
    """#RRGGBB -> 0xRRGGBB для lavfi-фильтров."""
    return "0x" + color.lstrip("#")


def _base() -> list[str]:
    return ["ffmpeg", "-y", "-loglevel", "error"]


def _out_args(duration: int, output_path: str) -> list[str]:
    return [
        "-t", str(duration),
        "-r", str(FPS),
        "-pix_fmt", "yuv420p",
        output_path,
    ]


# === Команды по сценам ===

def _data_flow(p: SceneParams, out: str) -> list[str]:
    src = (
        f"gradients=s={W}x{H}:c0={_hx(p.color_from)}:c1={_hx(p.color_to)}"
        f":x0=0:y0=0:x1={W}:y1={H}:speed={p.speed}:rate={FPS}:duration={p.duration}"
    )
    vf = (
        f"zoompan=z='min(pzoom+0.0015,1.4)':d=1:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}"
    )
    return _base() + ["-f", "lavfi", "-i", src, "-vf", vf] + _out_args(p.duration, out)


def _growth_chart(p: SceneParams, out: str) -> list[str]:
    n = 7
    bar_w = 90
    gap = (W - n * bar_w) / (n + 1)
    baseline = H - 180
    top_limit = 320
    max_h = baseline - top_limit
    heights = [0.35, 0.55, 0.42, 0.72, 0.60, 0.85, 0.97]
    rise = max(p.duration * 0.6, 0.5)
    boxes = []
    for i in range(n):
        x = int(gap * (i + 1) + bar_w * i)
        target = int(max_h * heights[i])
        # высота растёт от 0 до target, со ступенчатым стартом по столбцам
        h_expr = f"{target}*min(1\\,max(0\\,(t-{i * 0.12:.2f}))/{rise:.2f})"
        y_expr = f"{baseline}-({h_expr})"
        boxes.append(
            f"drawbox=x={x}:y='{y_expr}':w={bar_w}:h='{h_expr}'"
            f":color={_hx(p.color_to)}@0.95:t=fill"
        )
    src = (
        f"gradients=s={W}x{H}:c0={_hx(p.color_from)}:c1={_hx(p.color_to)}"
        f":speed={min(p.speed, 0.1)}:rate={FPS}:duration={p.duration}"
    )
    vf = ",".join(boxes)
    return _base() + ["-f", "lavfi", "-i", src, "-vf", vf] + _out_args(p.duration, out)


def _digital_grid(p: SceneParams, out: str) -> list[str]:
    src = (
        f"gradients=s={W}x{H}:c0={_hx(p.color_from)}:c1={_hx(p.color_to)}"
        f":speed={min(p.speed, 0.08)}:rate={FPS}:duration={p.duration}"
    )
    off = f"mod(t*{p.speed * 120:.2f}\\,80)"
    vf = (
        f"drawgrid=x='{off}':y='{off}':w=80:h=80:t=2:color={_hx(p.color_to)}@0.6,"
        f"hue=h='t*{p.speed * 120:.2f}'"
    )
    return _base() + ["-f", "lavfi", "-i", src, "-vf", vf] + _out_args(p.duration, out)


def _deep_fractal(p: SceneParams, out: str) -> list[str]:
    src = f"mandelbrot=s={W}x{H}:rate={FPS}:end_scale=0.0001"
    vf = f"hue=h='t*{p.speed * 80:.2f}':s=1.3"
    return _base() + ["-f", "lavfi", "-i", src, "-vf", vf] + _out_args(p.duration, out)


def _particles(p: SceneParams, out: str) -> list[str]:
    src = (
        f"gradients=s={W}x{H}:c0={_hx(p.color_from)}:c1={_hx(p.color_to)}"
        f":speed={min(p.speed, 0.08)}:rate={FPS}:duration={p.duration}"
    )
    vf = (
        f"noise=alls=42:allf=t+u,"
        f"zoompan=z='min(pzoom+0.001,1.25)':d=1:"
        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={W}x{H}:fps={FPS}"
    )
    return _base() + ["-f", "lavfi", "-i", src, "-vf", vf] + _out_args(p.duration, out)


def _calm_gradient(p: SceneParams, out: str) -> list[str]:
    src = (
        f"gradients=s={W}x{H}:c0={_hx(p.color_from)}:c1={_hx(p.color_to)}"
        f":x0=0:y0=0:x1={W}:y1={H}:speed={p.speed}:rate={FPS}:duration={p.duration}"
    )
    return _base() + ["-f", "lavfi", "-i", src] + _out_args(p.duration, out)


# === Реестр ===

_BUILDERS: dict[SceneKey, Callable[[SceneParams, str], list[str]]] = {
    SceneKey.DATA_FLOW: _data_flow,
    SceneKey.GROWTH_CHART: _growth_chart,
    SceneKey.DIGITAL_GRID: _digital_grid,
    SceneKey.DEEP_FRACTAL: _deep_fractal,
    SceneKey.PARTICLES: _particles,
    SceneKey.CALM_GRADIENT: _calm_gradient,
}

SCENES: dict[SceneKey, dict] = {
    SceneKey.DATA_FLOW: {
        "themes": ["AI", "данные", "аналитика", "поток данных", "нейросети"],
        "description": "Градиентные потоки с лёгким наездом камеры.",
        "default_params": {
            "color_from": "#0a0a2a",
            "color_to": "#00d4ff",
            "speed": 0.3,
            "duration": 4,
        },
    },
    SceneKey.GROWTH_CHART: {
        "themes": ["финансы", "крипта", "биткоин", "бизнес", "рост", "графики", "продажи"],
        "description": "Восходящие столбцы графика, растущие по времени.",
        "default_params": {
            "color_from": "#0a1f0a",
            "color_to": "#00ff88",
            "speed": 0.3,
            "duration": 4,
        },
    },
    SceneKey.DIGITAL_GRID: {
        "themes": ["tech", "технологии", "кибербезопасность", "сеть", "код", "матрица"],
        "description": "Анимированная цифровая сетка со сдвигом цвета.",
        "default_params": {
            "color_from": "#1a0a2a",
            "color_to": "#ff00aa",
            "speed": 0.3,
            "duration": 4,
        },
    },
    SceneKey.DEEP_FRACTAL: {
        "themes": ["будущее", "абстракция", "AI", "космос", "бесконечность"],
        "description": "Бесконечный наезд на фрактал Мандельброта со сменой оттенка.",
        "default_params": {
            "color_from": "#000000",
            "color_to": "#8800ff",
            "speed": 0.3,
            "duration": 5,
        },
    },
    SceneKey.PARTICLES: {
        "themes": ["стартап", "инновации", "запуск", "энергия", "креатив"],
        "description": "Движущиеся частицы (шум) с лёгким зумом.",
        "default_params": {
            "color_from": "#0a0a1a",
            "color_to": "#ffaa00",
            "speed": 0.3,
            "duration": 4,
        },
    },
    SceneKey.CALM_GRADIENT: {
        "themes": ["спокойствие", "минимализм", "универсальный fallback"],
        "description": "Мягкий медленный градиент. Универсальный фоллбэк.",
        "default_params": {
            "color_from": "#0a1f3c",
            "color_to": "#0066ff",
            "speed": 0.3,
            "duration": 5,
        },
    },
}


def build_command(params: SceneParams, output_path: str) -> list[str]:
    """Полный список аргументов ffmpeg для выбранной сцены."""
    builder = _BUILDERS[params.scene]
    return builder(params, output_path)
