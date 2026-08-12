"""Parametric cedar pergola assembly for the static viewer asset.

This is a STEP-first source inspired by the text-to-cad workflow. The generated
GLB is a derived browser asset; dimensions remain editable here in millimetres.
"""

from build123d import Align, Box, Color, Compound, Pos


WIDTH = 4800.0
DEPTH = 3500.0
HEIGHT = 2400.0
DECK_WIDTH = WIDTH + 1600.0
DECK_DEPTH = DEPTH + 1200.0

CEDAR = Color(0.28, 0.12, 0.065)
DECK = Color(0.38, 0.22, 0.12)
SHADOW = Color(0.16, 0.075, 0.04)


def beam(
    label: str,
    size: tuple[float, float, float],
    position: tuple[float, float, float],
    color: Color = CEDAR,
):
    part = Pos(*position) * Box(*size, align=(Align.CENTER, Align.CENTER, Align.MIN))
    part.label = label
    part.color = color
    return part


def gen_step():
    parts = []

    # Raised deck: individual boards keep the construction readable in GLB.
    parts.append(beam("deck_subframe", (DECK_WIDTH, DECK_DEPTH, 140), (0, 0, 0), SHADOW))
    board_count = 22
    board_depth = 210.0
    gap = 22.0
    start = -DECK_DEPTH / 2 + 120.0
    for index in range(board_count):
        z = start + index * (board_depth + gap)
        parts.append(
            beam(
                f"deck_board_{index + 1:02d}",
                (DECK_WIDTH - 160.0, board_depth, 38.0),
                (0, z, 140),
                DECK,
            )
        )

    post = 240.0
    for x in (-WIDTH / 2 + post / 2, WIDTH / 2 - post / 2):
        for y in (-DEPTH / 2 + post / 2, DEPTH / 2 - post / 2):
            parts.append(beam("frame_post", (post, post, HEIGHT), (x, y, 178), CEDAR))
            parts.append(beam("post_foot", (post + 110, post + 110, 150), (x, y, 28), SHADOW))

    beam_height = HEIGHT + 150
    parts.extend(
        [
            beam("front_fascia", (WIDTH + 420, 280, 280), (0, -DEPTH / 2, beam_height), CEDAR),
            beam("back_fascia", (WIDTH + 420, 280, 280), (0, DEPTH / 2, beam_height), CEDAR),
            beam("left_fascia", (280, DEPTH + 420, 280), (-WIDTH / 2, 0, beam_height), CEDAR),
            beam("right_fascia", (280, DEPTH + 420, 280), (WIDTH / 2, 0, beam_height), CEDAR),
            beam("front_shadow_beam", (WIDTH, 180, 170), (0, -DEPTH / 2 + 155, HEIGHT + 45), SHADOW),
            beam("back_shadow_beam", (WIDTH, 180, 170), (0, DEPTH / 2 - 155, HEIGHT + 45), SHADOW),
        ]
    )

    # Roof rafters run front-to-back and project slightly beyond the fascia.
    rafter_count = 17
    rafter_step = WIDTH / rafter_count
    for index in range(rafter_count):
        x = -WIDTH / 2 + rafter_step * (index + 0.5)
        parts.append(
            beam(
                f"roof_rafter_{index + 1:02d}",
                (115.0, DEPTH + 420.0, 130.0),
                (x, 0, HEIGHT + 275),
                CEDAR,
            )
        )

    return Compound(parts, label="cedar_pergola")
