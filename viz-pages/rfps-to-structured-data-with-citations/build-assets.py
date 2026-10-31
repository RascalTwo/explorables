"""Render every image the story needs, and derive story-data.json.

The page is a zooming canvas: the camera flies from one line of type, out to a page,
out to a document, out to the corpus, out to the pipeline. Each of those altitudes
needs real imagery at a resolution that survives being flown into, so this script
renders four families of asset:

  assets/hero/<stem>-p<n>.jpg   one page at 3x, sharp enough for the extreme close-up
  assets/deadline/<stem>.jpg    the page carrying submissionDeadline, one per document
  assets/grid/<stem>.jpg        every page of a document as one sprite sheet
  assets/cover/<stem>.jpg       page 1, small, for the corpus altitude

`assets/live/` is NOT rendered here, and neither are `assets/crop/ss427-p1.jpg` or
`assets/crop/ss427-chart.jpg` — those five are captured by hand (the chart one is a crop
of a region, which this script has no way to know about) and referenced straight from
viz.js. Clearing assets/ loses them for good. The OTHER crop pages are rendered, by
crops() below, because they are whole page ones and there is no reason to hand-capture
a whole page.

Everything the narration asserts is derived here from the pipeline's own cache, so
no number on screen is typed by hand. Run from the repo root:

    .venv/bin/python viz-pages/rfps-to-structured-data-with-citations/build-assets.py
"""
import json
import math
import pathlib
import re
import sys
from collections import Counter, defaultdict

import pymupdf as fitz
from PIL import Image

HERE = pathlib.Path(__file__).parent
# The viz page lives in this repo's published tree (`viz-pages/`), and the pipeline whose
# output it draws is a sibling at the repo root — same split as context-engine-dashboard and
# its viz page. So ROOT is that project, not the repo: `samples/` and `cache/` are read from
# there, along with `usage-ledger.jsonl`, which throughput() needs. All three are gitignored,
# so a fresh clone can serve this page but cannot rebuild it without re-fetching the samples
# and re-running the pipeline.
ROOT = HERE.parents[1] / "rfps-to-structured-data-with-citations"
ASSETS = HERE / "assets"

HERO = "flagstaff-downtown"       # small, legible, seven answers on page 1
SCAN_STEM = f"{HERO}-RASTERIZED"   # the same document with its text layer removed
MONSTER = "providence-public-works"  # 275 pages, the weight of the manual job

# Brysbaert (2019), J. Memory & Language 109:104047 — meta-analysis of 190 studies,
# 18,573 participants. 238 wpm silent non-fiction; most adults fall in 175-300.
READING = {"wpm": 238, "lo": 175, "hi": 300,
           "cite": "Brysbaert 2019, Journal of Memory & Language 109:104047",
           "citeUrl": "https://doi.org/10.1016/j.jml.2019.104047",
           "note": "adult silent reading, non-fiction; 190 studies, 18,573 participants"}

WORD = re.compile(r"[A-Za-z0-9][A-Za-z0-9'-]*")


def jpg(path: pathlib.Path, pix, quality=82):
    path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(path, jpg_quality=quality)
    return {"src": str(path.relative_to(HERE)), "w": pix.width, "h": pix.height}


def render(pdf: pathlib.Path, page_no: int, width: int):
    """Render a 1-based page to a pixmap `width` px wide."""
    with fitz.open(pdf) as doc:
        page = doc[page_no - 1]
        zoom = width / page.rect.width
        return (page.get_pixmap(matrix=fitz.Matrix(zoom, zoom)),
                page.rect.width, page.rect.height)


def norm(rects, pw, ph):
    """PDF points -> fractions of the page, so the front end can scale freely."""
    return [[round(x0 / pw, 5), round(y0 / ph, 5),
             round((x1 - x0) / pw, 5), round((y1 - y0) / ph, 5)]
            for x0, y0, x1, y1 in rects]


def sources() -> dict[str, tuple[str, str]]:
    """(host, url) per file, from the provenance table. The host is what fits under a
    thumbnail; the url is what makes it a link, so "these came off the open internet"
    is a claim anyone in the room can check by clicking it."""
    rows = (ROOT / "samples" / "PROVENANCE.md").read_text()
    # `[^/\s]`, not `\S`: the corpus lives at samples/<stem>.pdf, and PROVENANCE also
    # carries tables for files in subdirectories (samples/crop/) that are deliberately
    # NOT corpus documents. Matching those put `crop/armor-1575-corn` in this map, which
    # every caller reads as a document that exists.
    return {stem: (re.sub(r"^www\.", "", url.split("/")[2]), url)
            for stem, url in re.findall(r"\|\s*`([^/\s]+?)\.pdf`\s*\|\s*(https?://\S+?)\s*\|", rows)}


# The camera frames a scene into a wide, short safe area (the narration is a full-
# width lower third). A near-square page grid is therefore height-limited and renders
# small with dead space either side, so grids are laid out to roughly this aspect.
GRID_ASPECT = 2.15


def sprite(stem: str, pages: int, cell_w: int, page_aspect: float) -> dict:
    """Every page of a document as one image. 275 separate <img> tags is 275 requests
    and a scroll jank; one sheet is one request and a background-position."""
    cols = min(30, max(1, round(math.sqrt(pages * GRID_ASPECT * page_aspect))))
    rows = math.ceil(pages / cols)
    sheet = None
    with fitz.open(ROOT / "samples" / f"{stem}.pdf") as doc:
        for i, page in enumerate(doc):
            zoom = cell_w / page.rect.width
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            if sheet is None:
                cell_h = pix.height
                sheet = Image.new("RGB", (cols * cell_w, rows * cell_h), "#ffffff")
            sheet.paste(img.resize((cell_w, cell_h)),
                        ((i % cols) * cell_w, (i // cols) * cell_h))
    out = ASSETS / "grid" / f"{stem}.jpg"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=78)
    return {"src": str(out.relative_to(HERE)), "cols": cols, "rows": rows,
            "cellW": cell_w, "cellH": cell_h, "pages": pages}


def cited_pages(stem: str) -> dict[int, list[str]]:
    by = defaultdict(list)
    for c in json.loads((ROOT / "cache" / "citations" / f"{stem}.json").read_text()):
        if c.get("found") and c["field"] not in by[c["page"]]:
            by[c["page"]].append(c["field"])
    return dict(sorted(by.items()))


def page_rects(stem: str, pdf: pathlib.Path) -> dict[str, list]:
    """Every located citation box, keyed by page, normalised to its own page.

    The grid altitude claims six of twenty-two pages carry an answer. Ringing those
    six is the claim; drawing the boxes on them is the evidence, and it costs one
    more pass over citation data already on disk.
    """
    out = defaultdict(list)
    with fitz.open(pdf) as doc:
        for c in json.loads((ROOT / "cache" / "citations" / f"{stem}.json").read_text()):
            if c.get("found"):
                r = doc[c["page"] - 1].rect
                out[str(c["page"])] += norm(c["rects"], r.width, r.height)
    return dict(sorted(out.items(), key=lambda kv: int(kv[0])))


def trace(stem: str, pdf: pathlib.Path, field: str = "submissionDeadline") -> dict:
    """One page, followed the whole way through, in the pipeline's own artefacts.

    Every panel in the walkthrough scenes is a real string off disk: the text layer
    PyMuPDF pulled out of the PDF, the markdown the model wrote back for that page,
    the question the extractor actually asks for this field, the value and the
    verbatim quote it returned, and the rectangle the locate pass matched that quote
    to. Nothing in that sequence is illustrative — if the pipeline changes its mind,
    re-running this script changes what the story shows.
    """
    sys.path.insert(0, str(ROOT / "src"))
    from extract_fields import FIELDS, PROMPT_HEAD

    pages = json.loads((ROOT / "cache" / "docs" / f"{stem}.json").read_text())
    cites = json.loads((ROOT / "cache" / "citations" / f"{stem}.json").read_text())
    fields = json.loads((ROOT / "cache" / "fields" / f"{stem}.json").read_text())

    cite = next(c for c in cites if c["field"] == field and c.get("found"))
    page_no = cite["page"]
    # cache/docs numbers its pages from 0; citations number theirs from 1. Matching
    # `p["page"] == page_no` across that boundary silently returns the page after the
    # one being traced — which showed the table of contents under a heading that said
    # page 1.
    md = next(p["markdown"] for p in pages if p["page"] == page_no - 1)
    with fitz.open(pdf) as doc:
        page = doc[page_no - 1]
        text_layer = page.get_text()
        r = page.rect
        # The words the locate pass actually matched, with the boxes the PDF carries for
        # them — i.e. the words inside the rectangle it returned. This panel used to be
        # hand-typed coordinates, which made it the one illustrative thing in a strip
        # whose entire argument is that everything else is a real artefact.
        # A scanned page carries no words at all, so `get_text("words")` returns nothing
        # and the walkthrough's method-2 panel had no artefact to show — on the one
        # station whose whole claim is that OCR hands back the same shape of answer the
        # PDF would have. Ask Tesseract, through the pipeline's own `_ocr_words`, so the
        # panel shows the words the locate pass really matched on rather than asserting
        # that it matched on something. `_ocr_words` numbers pages from 0.
        words_of = page.get_text("words")
        if not words_of:
            from locate_citations import _ocr_words
            words_of = _ocr_words(str(pdf), page_no - 1)
        hits = [w for w in words_of
                if any(fitz.Rect(rect).intersects(fitz.Rect(w[:4])) for rect in cite["rects"])]
        matched = [{"w": w[4], "x": round(w[0]), "y": round(w[1])} for w in hits]

    return {
        "field": field,
        "page": page_no,
        "textLayer": text_layer,
        "textLayerChars": len(text_layer),
        "markdown": md,
        "markdownChars": len(md),
        "docChars": sum(len(p["markdown"]) for p in pages),
        "pages": len(pages),
        "question": FIELDS[field],
        "rule": [m.strip().replace("\n", " ") for m in re.findall(
            r"(Do not guess[^.]*\.[^.]*\.|Copy them character for character[^.]*\.)",
            PROMPT_HEAD)],
        "value": fields[field]["value"],
        "quote": fields[field]["evidence"][0]["verbatim_quote"],
        # Every field the same call answered, with how many passages each answer had to
        # cite. One question is easier to draw than fifteen; the fifteen are what
        # actually happen, and some answers rest on four separate quotes.
        "answers": [{"field": k, "quotes": len(v.get("evidence") or []),
                     "found": v["value"] is not None} for k, v in fields.items()],
        "rects": norm(cite["rects"], r.width, r.height),
        "words": matched,
        "exact": cite["exact"],
        "ocr": cite["ocr"],
    }


# The hard documents, as (file in samples/crop/, run in cache/open/). Every one has been
# through open extraction already, so putting them on the page costs a render and nothing
# else. SS-427 is in the list even though its own scene uses the two hand-captured images:
# the index that now fronts these four wants all four drawn the same way, and rendering
# its page here rather than special-casing it is the cheaper of the two.
CROP_EXTRA = [("martin-seed-ss427-4-corn", "ss427-corn"),
              ("armor-1575-corn", "armor-1575-corn"),
              ("dekalb-2021-corn-agronomic-ratings-p13", "dekalb-2021-corn-agronomic-ratings-p13"),
              ("martin-seed-m355xf-soybean", "martin-seed-m355xf-soybean")]


def crop_sources() -> dict[str, str]:
    r"""Source URLs for samples/crop/. `sources()` deliberately refuses to match these —
    its `[^/\s]` excludes anything in a subdirectory, because crop sheets are not corpus
    documents and every caller of `sources()` reads its keys as ones that are."""
    rows = (ROOT / "samples" / "PROVENANCE.md").read_text()
    return dict(re.findall(
        r"\|\s*`crop/([^\s`]+?)\.pdf`\s*\|[^|]*?(https?://\S+?)\s*\|", rows))


def crops() -> list[dict]:
    """Page one of each other hard document, with what its open-extraction run found.

    Nothing here is written down twice: the counts come out of cache/open/, the split
    between printed and graphical measurements is the model's own `printedAsText` flag,
    and the URL comes out of PROVENANCE. If a sheet is re-run and finds something else,
    the page says something else.
    """
    urls = crop_sources()
    out = []
    for stem, run_stem in CROP_EXTRA:
        pdf = ROOT / "samples" / "crop" / f"{stem}.pdf"
        # 1500px wide: these are read at a whole-page altitude, not flown into, so the
        # hero's 3x treatment would be several megabytes for nothing.
        pix, pw, ph = render(pdf, 1, 1500)
        run = json.loads((ROOT / "cache" / "open" / f"{run_stem}.json").read_text())
        cat, rec = run["catalogue"], run["record"]
        ms = cat["measurements"]
        vals = rec["measurements"]
        out.append({
            "stem": stem,
            "img": jpg(ASSETS / "crop" / f"{stem}-p1.jpg", pix),
            # SS-427's URL is on a different PROVENANCE row (it is also a corpus document),
            # so fall back to the one viz.js already links from its own scene.
            "url": urls.get(stem, ""),
            "subject": cat["subjectKey"],
            "docType": cat["documentType"],
            "attributes": len(cat["attributes"]),
            "measurements": len(ms),
            # The model marks each measurement as printed-as-text or not; the count of
            # the ones that are not IS the claim these sheets are here to make.
            "graphical": sum(1 for m in ms if not m.get("printedAsText", True)),
            # What actually came back. A null here is the extractor declining rather than
            # guessing — PROMPT_HEAD says a confidently wrong value is worse than none —
            # and on the sheets whose numbers are only bar lengths, that is most of them.
            "nulls": sum(1 for v in vals.values() if v is None),
            "attrRows": [[k, str(v)] for k, v in rec["attributes"].items()],
            "measRows": [[k, None if v is None else str(v)] for k, v in vals.items()],
            # The model's own wording on what the rating scale turned out to be, which on
            # three of these four is the whole finding.
            "scaleNote": " ".join((rec["scale"].get("note") or cat["scaleNote"]).split()),
        })
    return out


def model_box(stem: str, pdf: pathlib.Path, page_no: int, quote: str) -> dict:
    """Method 3, run once, on the same page and quote methods 1 and 2 were given.

    `locate_citations.py` has a third tier that hands the phrase to a model and asks
    where it is. It is gated behind `model_fallback` and ships off, so nothing in
    cache/citations/ was ever produced by it and the walkthrough's last station had no
    artefact — it asserted its own conclusion in prose while the two stations beside it
    proved theirs with a rectangle. One call fixes that: the box the model really returns
    for this quote, drawn beside the box the text search really matched.

    Cached on disk, because it is a billed model call and this script runs on every
    build. Delete cache/locate-model/<stem>-p<n>.json to re-run it.
    """
    out = ROOT / "cache" / "locate-model" / f"{stem}-p{page_no}.json"
    if not out.exists():
        sys.path.insert(0, str(ROOT / "src"))
        from locate_citations import _model_boxes

        got = _model_boxes(str(pdf), page_no - 1, [quote])
        if not got:
            # _model_boxes swallows its own failures and returns {}. Writing an empty
            # result would cache the failure; leave it uncached and let the viz say so.
            print(f"[model_box] no box returned for {stem} p{page_no} — station 7 will "
                  f"say the box is missing. Check AWS credentials and re-run.")
            return {"rects": []}
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(got.get(0, [])))
    with fitz.open(pdf) as doc:
        r = doc[page_no - 1].rect
    return {"rects": norm(json.loads(out.read_text()), r.width, r.height)}


def words(stem: str) -> tuple[int, list[int]]:
    pages = json.loads((ROOT / "cache" / "docs" / f"{stem}.json").read_text())
    per = [len(WORD.findall(p["markdown"])) for p in pages]
    return sum(per), per


def throughput() -> dict:
    """Measured pages/minute for conversion, from the cost ledger.

    Only conversion is reported. Its calls run as one parallel burst, so the
    timestamp span really is wall-clock. The extract_fields spans are not — those
    calls were made across development sessions, and a span of 121 minutes on a
    22-page document is a record of someone going to lunch, not of the pipeline
    being slow. Reporting it would be a lie in the honest direction, which is
    still a lie.
    """
    by = defaultdict(list)
    for line in (ROOT / "usage-ledger.jsonl").read_text().splitlines():
        if not line.strip():
            continue
        r = json.loads(line)
        if r.get("step") == "page_to_markdown" and "doc" in r:
            by[r["doc"].removesuffix(".pdf")].append(r["ts"])
    runs = []
    for stem, ts in by.items():
        span, n = max(ts) - min(ts), len(ts)
        # A burst is contiguous; anything slower than 2s/page had a gap in it.
        if n >= 20 and span > 0 and span / n < 2.0:
            runs.append({"stem": stem, "pages": n, "seconds": round(span, 1),
                         "perMin": round(n / (span / 60), 1)})
    runs.sort(key=lambda r: -r["pages"])
    total_p = sum(r["pages"] for r in runs)
    total_s = sum(r["seconds"] for r in runs)
    return {"runs": runs, "pagesPerMin": round(total_p / (total_s / 60), 1),
            "basis": f"{total_p} pages across {len(runs)} clean parallel bursts"}


# A page whose text layer holds less than this is a scan for our purposes. Not zero: a
# scanned page usually carries a stamp, a page number or a header the OCR of whoever
# produced it did recover, so "no text at all" undercounts what the eye calls a scan.
SCANNED_MAX_CHARS = 60


def usd_2025(calls: list[dict]) -> float:
    """The same tokens, billed at the 2025 list prices of the models these replaced.

    A cost claim with no date is not a claim. This corpus was converted 2026-08-24 to
    2026-09-07, so $37.94 is 2026 pricing on 2026 models — quoted bare it reads as a
    fact about extracting RFPs, when half of it is a fact about one month's price
    list. Pricing the identical token counts a year back is the only honest way to
    say which half moved.

    Rates come from the pipeline's own table rather than being retyped, so prices
    live in one place. The mapping is deliberately exhaustive: an unmapped model
    raises here rather than quietly billing itself at its own rate, because a silent
    under-report on a page whose whole claim is "nothing is typed by hand" is worse
    than a failed build.
    """
    sys.path.insert(0, str(ROOT / "src"))   # same hop trace() makes
    from usage import RATES

    prior = {"opus-5": "opus-4", "sonnet-5": "sonnet-4"}
    return sum(r["input_tokens"] / 1e6 * RATES[prior[r["model"]]][0]
               + r["output_tokens"] / 1e6 * RATES[prior[r["model"]]][1] for r in calls)


def corpus() -> list[dict]:
    """One row per corpus document, every figure counted from disk.

    This was a hand-maintained `data.json` until 2026-09-07 — which is how the page came to
    advertise 289 of 293 citations while re-running produced 278 of 292, and how ten cost
    bars came to sit below their own ledger rows. Nothing here is typed.

    Membership follows `PROVENANCE.md`: add a row to that table and the document joins the
    corpus. The rasterised derivative is appended separately because it is generated, not
    downloaded, and so is deliberately absent from the provenance table.

    `usd` is ONE END-TO-END RUN — the latest conversion pass for the document plus its
    latest extraction. Experiments (per-field sweeps, model-located boxes, open extraction,
    re-runs) are real money and are deliberately NOT in it: this figure answers "what does
    it cost to process this document", not "what has this project spent". `src/usage.py`
    answers the second, and the two will not agree. Both are correct.
    """
    ledger = [json.loads(x) for x in
              (ROOT / "usage-ledger.jsonl").read_text().splitlines() if x.strip()]
    convert: dict[str, dict[int, dict]] = defaultdict(dict)
    extract: dict[str, dict] = {}
    for r in ledger:
        doc = (r.get("doc") or "").removesuffix(".pdf")
        if r.get("step") == "page_to_markdown":
            page, seen = r.get("page"), convert[doc]
            # Keep the most recent row per page: a re-converted document has two passes in
            # the ledger, and one run is what a reader is being quoted.
            if page not in seen or r["ts"] > seen[page]["ts"]:
                seen[page] = r
        elif r.get("step") == "extract_fields" and (
                doc not in extract or r["ts"] > extract[doc]["ts"]):
            extract[doc] = r

    rows = []
    for stem in [*sources(), "flagstaff-downtown-RASTERIZED"]:
        with fitz.open(ROOT / "samples" / f"{stem}.pdf") as doc:
            pages = len(doc)
            scanned = sum(1 for pg in doc
                          if len(pg.get_text().strip()) < SCANNED_MAX_CHARS)
        fields = json.loads((ROOT / "cache" / "fields" / f"{stem}.json").read_text())
        cites = json.loads((ROOT / "cache" / "citations" / f"{stem}.json").read_text())
        calls = [*convert[stem].values(), *([extract[stem]] if stem in extract else [])]
        usd = sum(r["usd"] for r in calls)
        rows.append({
            "stem": stem,
            "pages": pages,
            "scanned_pages": scanned,
            "fields": sum(1 for f in fields.values() if f["value"] is not None),
            "field_total": len(fields),
            "cites": len(cites),
            "located": sum(1 for c in cites if c["found"]),
            "exact": sum(1 for c in cites if c["exact"]),
            "ocr": sum(1 for c in cites if c["ocr"]),
            "approx": sum(1 for c in cites if c.get("approx")),
            "usd": round(usd, 3),
            "usd_2025": round(usd_2025(calls), 3),
        })
    return rows


def main() -> None:
    # data.json is an OUTPUT now, not an input. It stays on disk because it is the legible
    # form of the corpus table and it is what a diff reads, but nothing hand-edits it.
    corpus_rows = corpus()
    (HERE / "data.json").write_text(json.dumps(corpus_rows, indent=1))
    host = sources()
    stats = {d["stem"]: d for d in corpus_rows}

    docs = []
    for d in sorted((x for x in corpus_rows if not x["stem"].endswith("RASTERIZED")),
                    key=lambda x: -x["pages"]):
        stem = d["stem"]
        pdf = ROOT / "samples" / f"{stem}.pdf"
        total_words, per_page = words(stem)

        pix, pw, ph = render(pdf, 1, 300)
        cover = jpg(ASSETS / "cover" / f"{stem}.jpg", pix)

        # The same fact, on a different page and a different spot, ten times over.
        cites = json.loads((ROOT / "cache" / "citations" / f"{stem}.json").read_text())
        dl = next(c for c in cites if c["field"] == "submissionDeadline" and c.get("found"))
        dpix, dpw, dph = render(pdf, dl["page"], 700)
        deadline = {
            "page": dl["page"],
            "img": jpg(ASSETS / "deadline" / f"{stem}.jpg", dpix),
            "rects": norm(dl["rects"], dpw, dph),
            "quote": dl["quote"],
            "value": json.loads((ROOT / "cache" / "fields" / f"{stem}.json").read_text())
                        ["submissionDeadline"]["value"],
        }

        docs.append({
            "stem": stem, "label": stem.replace("-", " "),
            "pages": d["pages"], "words": total_words,
            "cites": d["cites"], "located": d["located"], "exact": d["exact"],
            "ocr": d["ocr"], "approx": d["approx"],
            "fields": d["fields"], "fieldTotal": d["field_total"],
            "scannedPages": d["scanned_pages"], "usd": d["usd"],
            "usd2025": d["usd_2025"],
            "source": host.get(stem, ("?", ""))[0],
            "url": host.get(stem, ("?", ""))[1], "aspect": round(ph / pw, 4),
            "cover": cover, "deadline": deadline,
            "citedPageCount": len(cited_pages(stem)),
        })

    # ── the hero: one page, seven answers, every box real ────────────────────────
    hero_pdf = ROOT / "samples" / f"{HERO}.pdf"
    hpix, hpw, hph = render(hero_pdf, 1, 2000)
    hero_fields = json.loads((ROOT / "cache" / "fields" / f"{HERO}.json").read_text())
    hero_cites = json.loads((ROOT / "cache" / "citations" / f"{HERO}.json").read_text())
    p1 = [c for c in hero_cites if c["page"] == 1 and c.get("found")]
    seen, marks = set(), []
    for c in p1:
        if c["field"] in seen:
            continue
        seen.add(c["field"])
        marks.append({"field": c["field"], "quote": c["quote"],
                      "value": hero_fields[c["field"]]["value"],
                      "rects": norm(c["rects"], hpw, hph)})
    hero_words, hero_per_page = words(HERO)

    hero = {
        "stem": HERO, "pages": stats[HERO]["pages"], "words": hero_words,
        "img": jpg(ASSETS / "hero" / f"{HERO}-p1.jpg", hpix, quality=88),
        "aspect": round(hph / hpw, 4),
        "marks": marks,
        "grid": sprite(HERO, stats[HERO]["pages"], 210, hph / hpw),
        "citedPages": {str(k): v for k, v in cited_pages(HERO).items()},
        "citedPageRects": page_rects(HERO, hero_pdf),
        "perPageWords": hero_per_page,
        "fields": {k: v["value"] for k, v in hero_fields.items()},
    }

    # ── the monster: same shape, 275 pages of it ─────────────────────────────────
    mon_words, mon_per_page = words(MONSTER)
    mon_cited = cited_pages(MONSTER)
    monster = {
        "stem": MONSTER, "pages": stats[MONSTER]["pages"], "words": mon_words,
        "usd": stats[MONSTER]["usd"],
        "grid": sprite(MONSTER, stats[MONSTER]["pages"], 60,
                       next(d["aspect"] for d in docs if d["stem"] == MONSTER)),
        "citedPages": {str(k): v for k, v in mon_cited.items()},
        "citedPageCount": len(mon_cited),
        "fields": {k: v["value"] for k, v in
                   json.loads((ROOT / "cache" / "fields" / f"{MONSTER}.json").read_text()).items()},
        "perPageWords": mon_per_page,
    }

    tally = Counter()
    for d in corpus_rows:
        if d["stem"].endswith("RASTERIZED"):
            continue
        for k in ("cites", "located", "exact", "ocr", "approx"):
            tally[k] += d[k]
    tally["notFound"] = tally["cites"] - tally["located"]
    tally["partial"] = tally["located"] - tally["exact"] - tally["ocr"] - tally["approx"]

    # The corpus total mixes two populations and reads worse than either. The standard
    # 15 questions are the pipeline anyone would ship; the four image-only ones ran on a
    # single document, against engineering drawings whose text layer is 32-70 characters,
    # where the model answers with a DESCRIPTION of cast lettering rather than a string
    # that exists anywhere on the page. Quoting one number for both makes the shippable
    # half look worse than it is and invites exactly the objection it deserves. Split, so
    # the page can say which is which without anyone typing a number.
    sys.path.insert(0, str(ROOT / "src"))   # same hop trace() makes
    from extract_fields import FIELDS as STANDARD_FIELDS
    split = {"standard": Counter(), "visual": Counter()}
    for d in corpus_rows:
        if d["stem"].endswith("RASTERIZED"):
            continue
        for c in json.loads((ROOT / "cache" / "citations" / f"{d['stem']}.json").read_text()):
            side = split["standard"] if c["field"] in STANDARD_FIELDS else split["visual"]
            side["cites"] += 1
            side["located"] += 1 if c["found"] else 0
    for k, v in split.items():
        v["notFound"] = v["cites"] - v["located"]

    # Quote-level and claim-level are different questions and the second is the one a
    # reader asks. A field can rest on several quotes, so one unlocatable quote does not
    # leave its claim uncited: the single standard-field miss belongs to a field with six
    # evidence quotes, five of which located. Counted here so the card can say "every
    # value traces" as a number instead of an adjective.
    claims = {"filled": 0, "cited": 0}
    for d in corpus_rows:
        if d["stem"].endswith("RASTERIZED"):
            continue
        fields = json.loads((ROOT / "cache" / "fields" / f"{d['stem']}.json").read_text())
        located = {c["field"] for c in
                   json.loads((ROOT / "cache" / "citations" / f"{d['stem']}.json").read_text())
                   if c["found"]}
        for name, v in fields.items():
            if name not in STANDARD_FIELDS or v["value"] is None:
                continue
            claims["filled"] += 1
            claims["cited"] += 1 if name in located else 0
    tally["claims"] = claims
    tally["standard"] = dict(split["standard"])
    tally["visual"] = dict(split["visual"])

    hero_trace = trace(HERO, ROOT / "samples" / f"{HERO}.pdf")

    out = {
        "docs": docs,
        "hero": hero,
        "monster": monster,
        "corpus": {
            "docs": len(docs),
            "pages": sum(d["pages"] for d in docs),
            "words": sum(d["words"] for d in docs),
            "usd": round(sum(d["usd"] for d in docs), 2),
            # What the identical token counts would have billed on the previous
            # generation's 2025 list prices — see usd_2025(). Carried next to `usd` so
            # the page can date its own cost claim instead of implying the price of
            # reading an RFP is a constant.
            "usd2025": round(sum(d["usd2025"] for d in docs), 2),
            "fields": sum(d["fields"] for d in docs),
            "fieldTotal": sum(d["fieldTotal"] for d in docs),
            "citations": dict(tally),
        },
        "scanned": next(x for x in corpus_rows if x["stem"].endswith("RASTERIZED")),
        "reading": READING,
        "throughput": throughput(),
        "trace": hero_trace,
        # method 2 in the walkthrough ends where methods 1 and 3 do — on a page with a box
        # drawn on it — and this is where its box comes from. The rasterised copy of the
        # hero has no text layer at all, so its citations are OCR's work end to end: same
        # document, same quote, located from pixels. Showing the rectangle OCR produced is
        # a stronger claim than asserting "then method one runs on those, unchanged".
        "traceScan": trace(SCAN_STEM, ROOT / "samples" / f"{SCAN_STEM}.pdf"),
        # method 3 ends where methods 1 and 2 do, on the same page with a box on it —
        # except this box is the model's answer rather than a match, which is the whole
        # reason the tier is off.
        "traceModel": model_box(HERO, ROOT / "samples" / f"{HERO}.pdf",
                                hero_trace["page"], hero_trace["quote"]),
        "crops": crops(),
    }
    (HERE / "story-data.json").write_text(json.dumps(out, indent=1))

    c = out["corpus"]
    print(f"{c['docs']} documents · {c['pages']} pages · {c['words']:,} words · ${c['usd']}")
    print(f"citations {tally['located']}/{tally['cites']} located, {tally['notFound']} not found")
    print(f"hero {HERO}: {len(marks)} answers on page 1 of {hero['pages']}")
    print(f"monster {MONSTER}: {monster['citedPageCount']} of {monster['pages']} pages carry an answer")
    for c in out["crops"]:
        print(f"crop {c['stem']}: {c['attributes']} attributes, {c['measurements']} "
              f"measurements ({c['graphical']} graphical, {c['nulls']} returned null)")
    print(f"conversion measured at {out['throughput']['pagesPerMin']} pages/min "
          f"({out['throughput']['basis']})")


if __name__ == "__main__":
    main()
