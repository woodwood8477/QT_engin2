"""
Futura Medium centerline extractor.
Reads Futura.ttc (index 0) and outputs normalized centerline parameters
for use in the QuanTrios Canvas metafont renderer.

Run once: python3 extract_metrics.py
Output: JS-ready constants for focused-proof.html
"""

from fontTools.ttLib import TTCollection
from fontTools.pens.recordingPen import RecordingPen

FONT_PATH = "/root/.claude/uploads/362c6068-9928-4d74-8014-c53e57d4a173/78875e39-Futura.ttc"

ttc = TTCollection(FONT_PATH)
font = ttc[0]
glyphset = font.getGlyphSet()
hmtx = font['hmtx'].metrics

CAP = 1544   # H glyph outline height
XH  = 988    # x glyph outline height
UPM = font['head'].unitsPerEm


def get_outline(name):
    pen = RecordingPen()
    glyphset[name].draw(pen)
    return pen.value, hmtx[name][0]


def q2c(p0, p1, p2):
    """Convert quadratic to cubic bezier control points."""
    c1 = (p0[0] + 2/3*(p1[0]-p0[0]), p0[1] + 2/3*(p1[1]-p0[1]))
    c2 = (p2[0] + 2/3*(p1[0]-p2[0]), p2[1] + 2/3*(p1[1]-p2[1]))
    return c1, c2


def get_contour_bounds(ops):
    """Get xMin, xMax, yMin, yMax for each contour separately."""
    contours = []
    current = []
    for op, pts in ops:
        if op == 'moveTo':
            if current:
                contours.append(current)
            current = list(pts)
        elif op in ('lineTo', 'qCurveTo', 'curveTo'):
            current.extend(pts)
        elif op == 'closePath':
            contours.append(current)
            current = []
    if current:
        contours.append(current)

    result = []
    for pts in contours:
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        result.append({
            'xMin': min(xs), 'xMax': max(xs),
            'yMin': min(ys), 'yMax': max(ys),
            'pts': pts
        })
    return result


print("=" * 60)
print("Futura Medium — Centerline Parameter Extraction")
print(f"UPM={UPM}, cap={CAP}, xh={XH}")
print("=" * 60)

# ── O ─────────────────────────────────────────────────────────
ops, adv = get_outline('O')
contours = get_contour_bounds(ops)
outer = contours[0]
inner = contours[1]
cx_outer = (outer['xMin'] + outer['xMax']) / 2
cy_outer = (outer['yMin'] + outer['yMax']) / 2
rx_outer = (outer['xMax'] - outer['xMin']) / 2
ry_outer = (outer['yMax'] - outer['yMin']) / 2
cx_inner = (inner['xMin'] + inner['xMax']) / 2
cy_inner = (inner['yMin'] + inner['yMax']) / 2
rx_inner = (inner['xMax'] - inner['xMin']) / 2
ry_inner = (inner['yMax'] - inner['yMin']) / 2
rx_cl = (rx_outer + rx_inner) / 2
ry_cl = (ry_outer + ry_inner) / 2
print(f"\nO  adv={adv}")
print(f"  outer: cx={cx_outer:.0f} cy={cy_outer:.0f} rx={rx_outer:.0f} ry={ry_outer:.0f}")
print(f"  inner: cx={cx_inner:.0f} cy={cy_inner:.0f} rx={rx_inner:.0f} ry={ry_inner:.0f}")
print(f"  centerline rx={rx_cl:.1f} ry={ry_cl:.1f}")
print(f"  normalized (cap): cx={cx_outer/adv:.4f} cy={cy_outer/CAP:.4f}")
print(f"  rx/cap={rx_cl/CAP:.4f} ry/cap={ry_cl/CAP:.4f}")

# ── Q ─────────────────────────────────────────────────────────
ops_q, adv_q = get_outline('Q')
# Find tail points: the triangle of points distinct from circle
all_q_pts = [(p[0], p[1]) for op, pts in ops_q for p in pts]
# Tail outer low points near y=-28
tail_outer_pts = [(x, y) for x, y in all_q_pts if y < 200 and x > 1200]
# Tail inner diagonal
tail_inner_pts = [(x, y) for x, y in all_q_pts if 300 < y < 450 and x > 1100]
print(f"\nQ  adv={adv_q}")
print(f"  tail outer low pts: {sorted(tail_outer_pts)}")
print(f"  tail inner pts: {sorted(tail_inner_pts)}")
if tail_outer_pts and tail_inner_pts:
    tip_x = sum(p[0] for p in tail_outer_pts) / len(tail_outer_pts)
    tip_y = sum(p[1] for p in tail_outer_pts) / len(tail_outer_pts)
    start_x = sum(p[0] for p in tail_inner_pts) / len(tail_inner_pts)
    start_y = sum(p[1] for p in tail_inner_pts) / len(tail_inner_pts)
    print(f"  tail centerline start: ({start_x/adv_q:.4f}, {start_y/CAP:.4f}) cap-norm")
    print(f"  tail centerline end:   ({tip_x/adv_q:.4f}, {tip_y/CAP:.4f}) cap-norm")

# ── n ─────────────────────────────────────────────────────────
ops_n, adv_n = get_outline('n')
print(f"\nn  adv={adv_n}")
# Extract all points
n_pts = [(op, pts) for op, pts in ops_n]
# Find stems from vertical lines
# Left stem: x=142-368, right stem: x=755-981
left_stem_edges = [p[0] for op, pts in ops_n for p in pts if 100 < p[0] < 420]
right_stem_edges = [p[0] for op, pts in ops_n for p in pts if 700 < p[0] < 1020]
l_x_min = min(left_stem_edges) if left_stem_edges else 142
l_x_max = max(left_stem_edges) if left_stem_edges else 368
r_x_min = min(right_stem_edges) if right_stem_edges else 755
r_x_max = max(right_stem_edges) if right_stem_edges else 981
lsw = l_x_max - l_x_min
rsw = r_x_max - r_x_min
lcx = (l_x_min + l_x_max) / 2
rcx = (r_x_min + r_x_max) / 2
print(f"  left stem: {l_x_min}-{l_x_max} width={lsw:.0f} center={lcx:.1f}")
print(f"  right stem: {r_x_min}-{r_x_max} width={rsw:.0f} center={rcx:.1f}")
print(f"  left cx/adv={lcx/adv_n:.4f}  right cx/adv={rcx/adv_n:.4f}")

# Arch points: outer goes from (368,884) up to peak then down to (981,597)
# inner goes from (755,544) up to (573,799) then down to (368,470)
# Outer arch control points (first qCurveTo after x=368,y=884):
arch_outer = [(op, pts) for op, pts in ops_n if op == 'qCurveTo' and any(p[1] > 850 for p in pts)]
arch_inner = [(op, pts) for op, pts in ops_n if op == 'qCurveTo' and any(600 < p[1] < 850 for p in pts)]
print(f"  outer arch segments:")
for op, pts in arch_outer:
    print(f"    qCurveTo {pts}")
print(f"  inner arch segments:")
for op, pts in arch_inner:
    print(f"    qCurveTo {pts}")

# Compute arch start/end/peak from raw points
outer_arch_pts = []
inner_arch_pts = []
in_outer = False
in_inner = False
prev = None
for op, pts in ops_n:
    if op == 'lineTo' and pts[0][1] == 884:
        in_outer = True
        outer_arch_pts.append(pts[0])
    elif op == 'lineTo' and pts[0][0] == 981 and pts[0][1] == 0:
        in_outer = False
    elif in_outer and op == 'qCurveTo':
        outer_arch_pts.extend(pts)

    if op == 'lineTo' and pts[0][1] == 544:
        in_inner = True
        inner_arch_pts.append(pts[0])
    elif op == 'closePath':
        in_inner = False
    elif in_inner and op == 'qCurveTo':
        inner_arch_pts.extend(pts)

if outer_arch_pts and inner_arch_pts:
    outer_peak_y = max(p[1] for p in outer_arch_pts)
    inner_peak_y = max(p[1] for p in inner_arch_pts)
    outer_end = outer_arch_pts[-1]
    inner_start = inner_arch_pts[0]
    arch_start_y = (outer_arch_pts[0][1] + inner_arch_pts[-1][1]) / 2 if inner_arch_pts else 677
    arch_end_y = (outer_end[1] + inner_start[1]) / 2
    arch_peak_y = (outer_peak_y + inner_peak_y) / 2
    print(f"  arch start y (centerline) ≈ {arch_start_y:.0f} / xh = {arch_start_y/XH:.4f}")
    print(f"  arch peak y (centerline) ≈ {arch_peak_y:.0f} / xh = {arch_peak_y/XH:.4f}")
    print(f"  arch end y (centerline) ≈ {arch_end_y:.0f} / xh = {arch_end_y/XH:.4f}")

    # Cubic bezier through start, peak, end
    sx, sy = lcx, arch_start_y
    mx = (outer_arch_pts[len(outer_arch_pts)//2][0] + inner_arch_pts[len(inner_arch_pts)//2][0]) / 2
    my = arch_peak_y
    ex, ey = rcx, arch_end_y
    # Approximate c1, c2 by solving for cubic through midpoint
    # P1x + P2x = (mx - (1/8)(sx+ex)) * 8/3
    P1xP2x = (mx - (sx + ex)/8) * 8/3
    P1yP2y = (my - (sy + ey)/8) * 8/3
    c1x = sx + (ex - sx) * 0.35
    c2x = P1xP2x - c1x
    c1y = P1yP2y * 0.5
    c2y = P1yP2y - c1y
    print(f"  approx cubic bezier (normalized to adv, xh):")
    print(f"    start=({sx/adv_n:.4f}, {sy/XH:.4f})")
    print(f"    c1   =({c1x/adv_n:.4f}, {c1y/XH:.4f})")
    print(f"    c2   =({c2x/adv_n:.4f}, {c2y/XH:.4f})")
    print(f"    end  =({ex/adv_n:.4f}, {ey/XH:.4f})")

# ── u ─────────────────────────────────────────────────────────
ops_u, adv_u = get_outline('u')
print(f"\nu  adv={adv_u}")
u_left = [p[0] for op, pts in ops_u for p in pts if 100 < p[0] < 420]
u_right = [p[0] for op, pts in ops_u for p in pts if 700 < p[0] < 1020]
ulcx = (min(u_left) + max(u_left)) / 2 if u_left else 254.5
urcx = (min(u_right) + max(u_right)) / 2 if u_right else 861.5
print(f"  left cx/adv={ulcx/adv_u:.4f}  right cx/adv={urcx/adv_u:.4f}")
# Bowl bottom points
u_bowl_pts = [(x, y) for op, pts in ops_u for x, y in pts if y < 200]
if u_bowl_pts:
    bowl_bottom_y = min(p[1] for p in u_bowl_pts)
    print(f"  bowl bottom y = {bowl_bottom_y} / xh = {bowl_bottom_y/XH:.4f}")
# Junction point where bowl meets stems
u_junction = [(x, y) for op, pts in ops_u for x, y in pts if 150 < y < 470 and (x < 500 or x > 700)]
if u_junction:
    jy_vals = [p[1] for p in u_junction]
    jy = sum(jy_vals) / len(jy_vals)
    print(f"  junction y ≈ {jy:.0f} / xh = {jy/XH:.4f}")

# ── r ─────────────────────────────────────────────────────────
ops_r, adv_r = get_outline('r')
print(f"\nr  adv={adv_r}")
r_left = [p[0] for op, pts in ops_r for p in pts if 100 < p[0] < 420]
rlcx = (min(r_left) + max(r_left)) / 2 if r_left else 254.5
print(f"  stem cx/adv={rlcx/adv_r:.4f}")
# Shoulder end point
r_shoulder_pts = [(x, y) for op, pts in ops_r for x, y in pts if x > 500 and y > 600]
if r_shoulder_pts:
    sh_x = max(p[0] for p in r_shoulder_pts)
    sh_y = sum(p[1] for p in r_shoulder_pts if p[0] == sh_x)
    # highest x point
    rightmost = max(r_shoulder_pts, key=lambda p: p[0])
    print(f"  shoulder end: ({rightmost[0]/adv_r:.4f}, {rightmost[1]/XH:.4f})")

# ── a ─────────────────────────────────────────────────────────
ops_a, adv_a = get_outline('a')
print(f"\na  adv={adv_a}")
contours_a = get_contour_bounds(ops_a)
# Contour 0: outer (stem + bowl outer)
# Contour 1: inner (bowl hole)
outer_a = contours_a[0]
inner_a = contours_a[1]
# Stem: rightmost vertical section x=860-1086
stem_xs = [p[0] for op, pts in ops_a for p in pts if p[0] > 800]
if stem_xs:
    stem_l = min(stem_xs)
    stem_r = max(stem_xs)
    stem_cx = (stem_l + stem_r) / 2
    print(f"  stem: {stem_l}-{stem_r} center={stem_cx:.1f} / adv={stem_cx/adv_a:.4f}")

# Bowl inner (contour 1)
bowl_cx = (inner_a['xMin'] + inner_a['xMax']) / 2
bowl_cy = (inner_a['yMin'] + inner_a['yMax']) / 2
bowl_rx_inner = (inner_a['xMax'] - inner_a['xMin']) / 2
bowl_ry_inner = (inner_a['yMax'] - inner_a['yMin']) / 2
# Outer bowl: xMin from outer contour (left bowl edge), xMax = left edge of stem
bowl_xmin_outer = outer_a['xMin']
bowl_rx_outer = stem_cx - bowl_xmin_outer - (stem_cx - bowl_cx) if stem_xs else 504
bowl_ry_outer = bowl_ry_inner + (stem_l - inner_a['xMax'])  # rough
bowl_rx_cl = (bowl_rx_inner + bowl_rx_outer) / 2
bowl_ry_cl = (bowl_ry_inner + (inner_a['yMax'] - inner_a['yMin'] + (inner_a['xMax'] - stem_l)) ) / 2
# Simpler: bowl_ry_outer ≈ bowl_ry_inner + stem_width
stem_width = 233
bowl_ry_cl_simple = (bowl_ry_inner + bowl_ry_inner + stem_width) / 2
bowl_rx_cl_simple = (bowl_rx_inner + bowl_rx_inner + stem_width) / 2
print(f"  bowl inner: cx={bowl_cx:.1f} cy={bowl_cy:.1f} rx={bowl_rx_inner:.1f} ry={bowl_ry_inner:.1f}")
print(f"  bowl centerline (simple): rx={bowl_rx_cl_simple:.1f} ry={bowl_ry_cl_simple:.1f}")
print(f"  bowl cx/adv={bowl_cx/adv_a:.4f} cy/xh={bowl_cy/XH:.4f}")
print(f"  bowl rx_cl/xh={bowl_rx_cl_simple/XH:.4f} ry_cl/xh={bowl_ry_cl_simple/XH:.4f}")

# ── s ─────────────────────────────────────────────────────────
ops_s, adv_s = get_outline('s')
print(f"\ns  adv={adv_s}")
# Extract all bezier commands with their start points
s_cmds = []
cur = None
for op, pts in ops_s:
    if op == 'moveTo':
        cur = pts[0]
    elif op == 'lineTo':
        s_cmds.append(('L', cur, pts[0]))
        cur = pts[0]
    elif op == 'qCurveTo':
        # Convert each quadratic to cubic
        prev = cur
        for i in range(len(pts)-1):
            c1, c2 = q2c(prev, pts[i], pts[i+1] if i+1 < len(pts) else pts[-1])
            s_cmds.append(('Q', prev, c1, c2, pts[i+1] if i+1 < len(pts) else pts[-1]))
            prev = pts[i+1] if i+1 < len(pts) else pts[-1]
        cur = pts[-1]

print("  s path commands (normalized):")
for cmd in s_cmds[:15]:
    if cmd[0] == 'L':
        print(f"    lineTo ({cmd[2][0]/adv_s:.3f}, {cmd[2][1]/XH:.3f})")
    else:
        print(f"    curveTo ({cmd[3][0]/adv_s:.3f},{cmd[3][1]/XH:.3f}) "
              f"({cmd[4][0]/adv_s:.3f},{cmd[4][1]/XH:.3f}) end=({cmd[5][0] if len(cmd)>5 else cmd[4][0]}/{adv_s:.3f},...)")

# Upper start and lower end points of s
s_all_pts = [(p[0], p[1]) for op, pts in ops_s for p in pts]
s_top_pts = [(x, y) for x, y in s_all_pts if y > 700]
s_bot_pts = [(x, y) for x, y in s_all_pts if y < 300]
if s_top_pts:
    top_x = sum(p[0] for p in s_top_pts) / len(s_top_pts)
    top_y = sum(p[1] for p in s_top_pts) / len(s_top_pts)
    print(f"  upper region avg: ({top_x/adv_s:.3f}, {top_y/XH:.3f})")
if s_bot_pts:
    bot_x = sum(p[0] for p in s_bot_pts) / len(s_bot_pts)
    bot_y = sum(p[1] for p in s_bot_pts) / len(s_bot_pts)
    print(f"  lower region avg: ({bot_x/adv_s:.3f}, {bot_y/XH:.3f})")

# ── T ─────────────────────────────────────────────────────────
ops_t, adv_t = get_outline('T')
print(f"\nT  adv={adv_t}")
t_pts = [(p[0], p[1]) for op, pts in ops_t for p in pts]
stem_t = [x for x, y in t_pts if 0 < y < 1350]
bar_y_vals = [y for x, y in t_pts if y > 1300]
bar_x_vals = [x for x, y in t_pts if y > 1300]
if stem_t:
    t_stem_cx = (min(stem_t) + max(stem_t)) / 2
    print(f"  stem: {min(stem_t)}-{max(stem_t)} cx={t_stem_cx:.1f} / adv={t_stem_cx/adv_t:.4f}")
if bar_y_vals and bar_x_vals:
    bar_cx_y = (min(bar_y_vals) + max(bar_y_vals)) / 2
    print(f"  crossbar: y={min(bar_y_vals)}-{max(bar_y_vals)} center_y={bar_cx_y:.1f} / cap={bar_cx_y/CAP:.4f}")
    print(f"  crossbar x: {min(bar_x_vals)}-{max(bar_x_vals)} / adv: {min(bar_x_vals)/adv_t:.4f}-{max(bar_x_vals)/adv_t:.4f}")

# ── i ─────────────────────────────────────────────────────────
ops_i, adv_i = get_outline('i')
print(f"\ni  adv={adv_i}")
i_contours = get_contour_bounds(ops_i)
stem_c = i_contours[0]
dot_c = i_contours[1]
stem_i_cx = (stem_c['xMin'] + stem_c['xMax']) / 2
dot_cx = (dot_c['xMin'] + dot_c['xMax']) / 2
dot_cy = (dot_c['yMin'] + dot_c['yMax']) / 2
dot_r = (dot_c['xMax'] - dot_c['xMin']) / 2
print(f"  stem cx={stem_i_cx:.1f} / adv={stem_i_cx/adv_i:.4f}")
print(f"  dot: cx={dot_cx:.1f} cy={dot_cy:.1f} r={dot_r:.1f}")
print(f"  dot cx/adv={dot_cx/adv_i:.4f}  cy/xh={dot_cy/XH:.4f}  r/xh={dot_r/XH:.4f}")
print(f"  stem top y / xh = {stem_c['yMax']}/988 = {stem_c['yMax']/XH:.4f}")

# ── A, V, W ────────────────────────────────────────────────────
for gname in ['A', 'V', 'W']:
    ops_g, adv_g = get_outline(gname)
    g_pts = [(p[0], p[1]) for op, pts in ops_g for p in pts]
    if gname == 'A':
        # apex = highest y, feet = lowest y
        apex = max(g_pts, key=lambda p: p[1])
        feet = [p for p in g_pts if p[1] < 50]
        bar_pts = [p for p in g_pts if 370 < p[1] < 600]
        print(f"\nA  adv={adv_g}")
        print(f"  apex: ({apex[0]/adv_g:.4f}, {apex[1]/CAP:.4f})")
        if feet:
            print(f"  feet x: {sorted(set(p[0] for p in feet))}")
            feet_norm = [(x/adv_g, y/CAP) for x, y in feet]
            print(f"  feet norm: {[(f'{x:.4f}',f'{y:.4f}') for x,y in feet_norm]}")
        if bar_pts:
            bar_y = sum(p[1] for p in bar_pts) / len(bar_pts)
            print(f"  crossbar y ≈ {bar_y:.0f} / cap = {bar_y/CAP:.4f}")
    elif gname == 'V':
        nadir = min(g_pts, key=lambda p: p[1])
        tops = [p for p in g_pts if p[1] > 1400]
        print(f"\nV  adv={adv_g}")
        print(f"  nadir: ({nadir[0]/adv_g:.4f}, {nadir[1]/CAP:.4f})")
        if tops:
            top_xs = sorted(set(p[0] for p in tops))
            print(f"  top x values: {top_xs}")
            print(f"  top x norm: {[f'{x/adv_g:.4f}' for x in top_xs]}")
    elif gname == 'W':
        nadir_pts = [p for p in g_pts if p[1] < 100]
        peak_pts = [p for p in g_pts if 900 < p[1] < 1200]
        tops = [p for p in g_pts if p[1] > 1400]
        print(f"\nW  adv={adv_g}")
        if nadir_pts:
            print(f"  nadirs: {[(f'{x/adv_g:.4f}', f'{y/CAP:.4f}') for x,y in sorted(nadir_pts)]}")
        if peak_pts:
            pk = sorted(peak_pts, key=lambda p: abs(p[0] - adv_g/2))
            print(f"  center peak: ({pk[0][0]/adv_g:.4f}, {pk[0][1]/CAP:.4f})")
        if tops:
            top_xs = sorted(set(p[0] for p in tops))
            print(f"  top x norm: {[f'{x/adv_g:.4f}' for x in top_xs]}")

print("\n" + "=" * 60)
print("Extract complete.")
