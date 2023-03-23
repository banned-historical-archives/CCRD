import fs from 'fs';
import { parse } from 'node-html-parser';
import { ensureDirSync, } from "fs-extra";

function toPlainText(node) {
  const q = [node];
  const r = [];
  while (q.length) {
    const a = q.shift();
    const f = [];
    for (const child of a.childNodes) {
      f.push(child);
    }
    q.unshift(...f);
    if (a.nodeType === 3) {
      const text = a.textContent.trim();
      if (text)
      r.push(text);
    }
  }
  return r;
}

function parseHTML(html) {
  const dom = parse(html);
  const main = dom.querySelector(".main");
  let find_first_table = false;
  const res = [];

  // const t = toPlainText(main);
  // const dateIdx = t.findIndex(i => /^\d+[\.\．]\d+[\.\．]\d+/.test(i));

  let author_arr = [];
  for (let a = 0; a < main.childNodes.length; ++a) {
    const node = main.childNodes[a];
    const tagName = node.tagName;
    const className = node.getAttribute ? node.getAttribute("class") : "";

    if (!find_first_table) {
      if (tagName === "TABLE") {
        find_first_table = true;
      }
      continue;
    }

    const text = node.textContent;

    if (tagName === "BR") {
      if (!text) continue;
      else debugger;
    } else if (tagName === "P") {
      const lines = node.innerHTML.split("<br>");
      if (className === "titles") {
        if (a !== 2) {
          res.push(...lines.map((x) => ({ text: x, type: "paragraph" })));
          continue;
        }
        let dateIdx = lines.findIndex((i) => /\d+[\.\．]\d+[\.\．]\d+/.test(i));
        let authors = '';
        let title = '';
        if (dateIdx > 1) {
          if (!/^[（]/.test(lines[dateIdx - 1])) {
            title = lines.slice(0, dateIdx - 1).join("");
            authors = lines[dateIdx - 1];
          }
          if (authors) {
            authors = authors
              .split("等")[0]
              .replace(/、/, " ")
              .replace(/ +/g, " ")
              .split(" ");
              if (!author_arr.length) {
                author_arr= authors;

              }
          } else {
            title = lines.slice(0, dateIdx).join("");
          }
        } else {
            title = lines[0];
        }
        res.push({text: title, type: 'title'});
        if (authors)
        res.push({text: authors, type: 'authors'});
      } else if (className === "titleR") {
        res.push({ text, type: "appellation" });
      } else if (className === "titleB") {
        res.push({ text, type: "subtitle" });
      } else if (className === "titleN") {
        res.push({ text, type: "subtitle" });
      } else if (className === "headingB") {
        res.push({ text, type: "subtitle" });
      } else if (className === "headingRB") {
        res.push({ text, type: "subtitle" });
      } else if (className === "headingN") {
        res.push({ text, type: "subtitle" });
      } else if (className === "contents_C") {
        res.push({ text, type: "paragraph" });
      } else if (className === "contents") {
        res.push({ text, type: "paragraph" });
      } else if (!className) {
        if (!text.trim()) continue;
        res.push({ text, type: "paragraph" });
      } else {
        debugger;
      }
    } else if (tagName === "TABLE") {
      // TODO 表格不好处理，先简单转成文字
      res.push({text, type: 'paragraph'});
    } else if (tagName === "HR") {
      if (!text) continue;
      else debugger;
    } else if (tagName === "FONT") {
      if (text.trim() === "来源：") {
        res.push({ text, type: "source" });
      } else {
        debugger;
      }
    } else if (tagName === "TBODY") {
        // TODO
        res.push({ text: text.trim(), type: "paragraph" });
    } else if (tagName === "PRE") {
        // TODO
        res.push({ text: text.trim(), type: "paragraph" });
    } else if (tagName === "DIV") {
        // TODO
        res.push({ text: text.trim(), type: "paragraph" });
    } else {
      if (tagName) {
        debugger;
      }
      if (text.trim()) {
        res.push({ text: text.trim(), type: "paragraph" });
      }
    }
  }
  return {
    authors: author_arr,
    contents: res,
  };
}

const parseList = (html) => {
  const dom = parse(html);
  const res = [];
  const links = dom.querySelectorAll(
    "#MainContent_MainContent_ListView1_itemPlaceholderContainer a"
  );
  const spans = dom.querySelectorAll(
    "#MainContent_MainContent_ListView1_itemPlaceholderContainer span"
  );
  for (let i = 0; i < links.length; ++i) {
    res.push({ title: links[i].textContent, date: spans[i].textContent });
  }
  return res;
}

(async () => {
  let root = "v3";

  for (let i of fs.readdirSync(root).filter((x) => /^\d+/.test(x))) {
    for (let j of fs
      .readdirSync(`${root}/${i}`)
      .filter((x) => /^\d+/.test(x))) {
      for (let k of fs
        .readdirSync(`${root}/${i}/${j}`)
        .filter((x) => /^\d+/.test(x))) {
        const list_data = [];
        for (let l of fs
          .readdirSync(`${root}/${i}/${j}/${k}`)
          .filter((x) => /^list/.test(x))
          .sort((a, b) =>
            parseInt(a.substring(4)) > parseInt(b.substring(4)) ? 1 : -1
          )) {
          const html = fs
            .readFileSync(`${root}/${i}/${j}/${k}/${l}`)
            .toString();
          html.substring(
            html.indexOf(`<div class="main"`),
            html.indexOf(`\n    \n<script type="text/javascript">\n//<![CDATA[`)
          );
          list_data.push(...parseList(html));
        }
        for (let l of fs
          .readdirSync(`${root}/${i}/${j}/${k}`)
          .filter((x) => /^\d+/.test(x))) {
          const idx = parseInt(l);
          const html = fs
            .readFileSync(`${root}/${i}/${j}/${k}/${l}`)
            .toString();
          const res = parseHTML(
            html.substring(
              html.indexOf(`<div class="main"`),
              html.indexOf(
                `\n    \n<script type="text/javascript">\n//<![CDATA[`
              )
            )
          );

          // if (idx === 0) {
          //   const set_a = new Set(
          //     Array.from(res[0].text.replace(/^\d+\./, ""))
          //   );
          //   const len_a = set_a.size;
          //   Array.from(list_data[idx].title).forEach((i) => set_a.delete(i));
          //   const len_b = set_a.size;
          //   console.log(len_b / len_a);
          //   if (len_b / len_a > 0.3) {
          //     console.log(res[0].text, list_data[idx].title);
          //     debugger;
          //   }
          // } else {
          //   break;
          // }

          const title = list_data[idx].title.replace(/^\d+\. ?/, "");
          const date = list_data[idx].date;
          ensureDirSync(`json/${i}/${j}/${k}`);
          fs.writeFileSync(
            `json/${i}/${j}/${k}/${idx}.json`,
            JSON.stringify({
              title,
              date,
              ...res,
            })
          );
          ensureDirSync(`txt/${i}/${j}/${k}`);
          fs.writeFileSync(
            `txt/${i}/${j}/${k}/${idx}.txt`,
`标题：${title}
日期：${date}
作者：${res.authors.join(',')}

${res.contents.map(x => x.text).join('\n')}`
          );
        }
        console.log(i, j, k);
      }
      console.log(i, j);
    }
  }
})();