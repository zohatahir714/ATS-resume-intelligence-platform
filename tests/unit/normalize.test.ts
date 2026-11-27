import { describe, expect, it } from "vitest";

import { normalizeText } from "@/core/parsing/normalize";

describe("normalizeText — whitespace", () => {
  it("collapses runs of spaces and tabs and trims line ends", () => {
    expect(normalizeText("Skills\t\t  Python   SQL\n  Experience   ")).toBe(
      "Skills Python SQL\nExperience",
    );
  });

  it("normalises CRLF, CR and Unicode line separators to LF", () => {
    expect(normalizeText("Summary\r\nExperience\rEducation\u2028Skills")).toBe(
      "Summary\nExperience\nEducation\nSkills",
    );
  });

  it("collapses three or more newlines into one blank line", () => {
    expect(normalizeText("Summary\n\n\n\nExperience\n\n\nSkills")).toBe(
      "Summary\n\nExperience\n\nSkills",
    );
  });

  it("preserves a single blank line between paragraphs", () => {
    expect(normalizeText("Summary\n\nExperience")).toBe(
      "Summary\n\nExperience",
    );
  });

  it("returns an empty string for whitespace-only input", () => {
    expect(normalizeText(" \n\t\n  \r\n")).toBe("");
    expect(normalizeText("")).toBe("");
  });

  it("does not touch spaces inside a line beyond collapsing them", () => {
    expect(normalizeText("analysed 2,500  records")).toBe(
      "analysed 2,500 records",
    );
  });
});

describe("normalizeText — control and invisible characters", () => {
  it("drops C0 and C1 control characters", () => {
    expect(normalizeText("Leadership\u0000\u0007 and \u0088delivery")).toBe(
      "Leadership and delivery",
    );
  });

  it("treats a form feed as a line break", () => {
    expect(normalizeText("page one\fpage two")).toBe("page one\npage two");
  });

  it("removes soft hyphens and zero-width characters", () => {
    expect(normalizeText("\uFEFFresponsi\u00ADbility\u200B \u200Eworks")).toBe(
      "responsibility works",
    );
  });

  it("turns non-breaking and other Unicode spaces into plain spaces", () => {
    expect(normalizeText("Skills\u00A0\u00A0Python\u2009SQL\u3000Go")).toBe(
      "Skills Python SQL Go",
    );
  });
});

describe("normalizeText — de-hyphenation", () => {
  it("joins a word broken across a line by a hyphen", () => {
    expect(normalizeText("Improved responsi-\nbility for the team")).toBe(
      "Improved responsibility for the team",
    );
  });

  it("joins when the continuation line is indented", () => {
    expect(normalizeText("Recycled mate-\n    rial weekly")).toBe(
      "Recycled material weekly",
    );
  });

  it("joins non-breaking and Unicode hyphens at a line break", () => {
    expect(normalizeText("deploy\u2011\nment pipeline")).toBe(
      "deployment pipeline",
    );
  });

  it("keeps the hyphen when the continuation starts with a digit or capital", () => {
    expect(normalizeText("COVID-\n19 response")).toBe("COVID-\n19 response");
    expect(normalizeText("Node-\nJS stack")).toBe("Node-\nJS stack");
  });

  it("keeps ordinary hyphens inside a line", () => {
    expect(normalizeText("full-stack engineer, 3+ years")).toBe(
      "full-stack engineer, 3+ years",
    );
  });

  it("never joins across a paragraph break", () => {
    expect(normalizeText("self-\n\nesteem")).toBe("self-\n\nesteem");
  });
});

describe("normalizeText — bullets", () => {
  it("replaces common bullet glyphs at the start of a line with a dash", () => {
    expect(normalizeText("• Built the thing")).toBe("- Built the thing");
    expect(normalizeText("▪\tBuilt")).toBe("- Built");
    expect(normalizeText("◦   Built")).toBe("- Built");
    expect(normalizeText("‣ Built")).toBe("- Built");
    expect(normalizeText("· Built")).toBe("- Built");
  });

  it("replaces a glyph bullet even without a following space", () => {
    expect(normalizeText("•Built the thing")).toBe("- Built the thing");
  });

  it("keeps nested indentation out and normalises every bullet line", () => {
    expect(normalizeText("  ● Nested point")).toBe("- Nested point");
  });

  it("leaves an existing dash bullet and mid-line glyphs alone", () => {
    expect(normalizeText("- Already a dash")).toBe("- Already a dash");
    expect(normalizeText("score • 90")).toBe("score • 90");
  });

  it("does not turn a decorative separator into a bullet", () => {
    expect(normalizeText("Skills\n―――――\nPython")).toBe(
      "Skills\n―――――\nPython",
    );
  });
});

describe("normalizeText — Unicode forms and technical tokens", () => {
  it("applies NFKC so ligatures and full-width text become ASCII", () => {
    expect(normalizeText("ﬁnancial ＡＢＣ analysis")).toBe(
      "financial ABC analysis",
    );
  });

  it("keeps the characters that technical terms depend on", () => {
    expect(normalizeText("C++, C#, Node.js, CI/CD and ASP.NET")).toBe(
      "C++, C#, Node.js, CI/CD and ASP.NET",
    );
  });

  it("keeps accented letters rather than stripping them", () => {
    expect(normalizeText("Résumé – café")).toBe("Résumé – café");
  });
});

describe("normalizeText — contract", () => {
  it("is idempotent", () => {
    const once = normalizeText(
      "\uFEFFExperience\r\n\r\n\r\n  • Led  a  team\t of 4\r\nSupported C++ and C#\r\n",
    );
    expect(normalizeText(once)).toBe(once);
  });

  it("normalises a small synthetic resume into stable lines", () => {
    const raw = [
      "\uFEFFJORDAN AVERY",
      "jordan.avery@example.com  •  +1 555 0100",
      "",
      "EXPERIENCE",
      "Analyst, Northwind Logistics      2021 – Present",
      "• Automated  a  weekly report, cutting 6 hours of manual work",
      "• Built dashboards with SQL and Python",
      "",
      "SKILLS",
      "SQL, Python, Excel",
    ].join("\r\n");

    expect(normalizeText(raw)).toBe(
      [
        "JORDAN AVERY",
        "jordan.avery@example.com • +1 555 0100",
        "",
        "EXPERIENCE",
        "Analyst, Northwind Logistics 2021 – Present",
        "- Automated a weekly report, cutting 6 hours of manual work",
        "- Built dashboards with SQL and Python",
        "",
        "SKILLS",
        "SQL, Python, Excel",
      ].join("\n"),
    );
  });
});
