import {JSDOM} from 'jsdom'
import fs from 'fs';

function parseHTML(html) {
  const dom = new JSDOM(html);
  const main = dom.window.document.querySelector(".main");
  let find_first_table = false;
  const res = [];
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
      if (className === "titles") {
      } else if (className === "titleR") {
      } else if (className === "titleB") {
      } else if (className === "titleN") {
      } else if (className === "headingB") {
      } else if (className === "headingRB") {
      } else if (className === "headingN") {
      } else if (className === "contents_C") {
      } else if (className === "contents") {
      } else if (!className) {
      } else {
        debugger;
      }
    } else if (tagName === "TABLE") {
      if (node.querySelector && node.querySelector(".inscriberR")) {
      } else {
        // TODO 表格不好处理，先简单转成文字
      }
    } else if (tagName === "HR") {
      if (!text) continue;
      else debugger;
    } else if (tagName === "FONT") {
      if (text.trim() === "来源：") {
      } else {
        debugger;
      }
    } else {
      if (tagName) {
        debugger;
      }
      if (text.trim()) {
        res.push({ text: text.trim(), type: "paragraph" });
      }
    }
  }
}

(async () => {
  let root = "v3";

  for (let i of fs.readdirSync(root)) {
    for (let j of fs.readdirSync(`${root}/${i}`)) {
      for (let k of fs.readdirSync(`${root}/${i}/${j}`)) {
        for (let l of fs.readdirSync(`${root}/${i}/${j}/${k}`)) {
          const html = fs
            .readFileSync(`${root}/${i}/${j}/${k}/${l}`)
            .toString();
          parseHTML(html);
        }
        console.log(i, j, k);
      }
      console.log(i, j);
    }
  }
})();