import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs-extra';
import dotenv from 'dotenv';
dotenv.config();

const sessionId = process.env.sessionId;
const ezId = process.env.ezId;
const aspxauth = process.env.aspxauth;
const url = 'http://ccrd.usc.cuhk.edu.hk.easyaccess1.lib.cuhk.edu.hk/Contents.aspx';

const safe_select = async (page, str, idx = 0) => {
  let target;
  const t1 = Date.now();
  while (!target) {
    if (Date.now() - t1 > 50 * 1000) {
      throw new Error("select timeout");
    }
    let t;
    try {
      t = await page.$$(str);
    } catch (e) {}
    if (idx === -1 && t) {
      target = t[t.length - 1];
    } else {
      target = t ? t[idx] : undefined;
    }
    if (!target) await sleep(200);
  }
  return target;
};
const safe_eval = async (page, str, validator) => {
  let res;
  const t1 = Date.now();
  while (!validator(res)) {
    if (Date.now() - t1 > 50 * 1000) {
      throw new Error("eval timeout");
    }
    try {
      res = await page.evaluate(str);
    } catch (e) {}
    if (!validator(res)) await sleep(200);
  }
  return res;
};
const sleep = (t) => new Promise((resolve) => setTimeout(resolve, t));
let browser;

const start = async (fidx = 0) => {
  browser = await puppeteer.launch({
    headless: false,
  });
  const context = await browser.createIncognitoBrowserContext({
     proxyServer: "http://127.0.0.1:1080",
  });
  const page = await context.newPage();
  // const page = await browser.newPage();
  global.page = page;
  const cookies = [
    ["ASP.NET_SessionId", sessionId],
    ["ezproxy", "http://easyaccess1.lib.cuhk.edu.hk," + ezId],
    ["ezproxyl", "http://easyaccess1.lib.cuhk.edu.hk," + ezId],
    [".ASPXAUTH", aspxauth],
  ].map((i) => ({
    name: i[0],
    value: i[1],
    domain: "ccrd.usc.cuhk.edu.hk.easyaccess1.lib.cuhk.edu.hk",
    path: "/",
    expires: -1,
    httpOnly: true,
    secure: false,
    sameSite: "Lax",
  }));
  await page.setCookie(...cookies);
  await page.goto(url, { timeout: 30000 });

  // 高度过低目录树可能报错
  await page.setViewport({ width: 1080, height: 2024 });

  const first_class_selector = `#TreeContent_TreeContent_TreeView1 table`;
  await safe_select(page, first_class_selector);
  const first_class_length = (await page.$$(first_class_selector)).length;

  for (let first_idx = fidx; first_idx < first_class_length; ++first_idx) {
    const first_class = await safe_select(
      page,
      first_class_selector,
      first_idx
    );
    console.log('first_class clicked', first_idx);
    (await first_class.$$("a"))[0].click();
    await sleep(2000);

    const second_class_selector = `#TreeContent_TreeContent_TreeView1n${first_idx}Nodes > table`;
    await safe_select(page, second_class_selector);
    const second_class_length = (await page.$$(second_class_selector)).length;
    for (let second_idx = 0; second_idx < second_class_length; ++second_idx) {
      if (second_idx > 0) {
        console.log('second class folded', second_idx);
        // 把前面的二级目录收起来，否则可能报错
        await safe_eval(
          page,
          `(() => {
          const a = document.body.querySelectorAll('${second_class_selector}')[${second_idx - 1}];
          if (a) {
            const b = a.querySelectorAll('a')[0];
            if (b.innerText) return 0;
b.click();
return 1;
          }
          return 0;
        })()`,
          (x) => x
        );
        await sleep(3000);
      }
      const second_class = await safe_select(
        page,
        second_class_selector,
        second_idx
      );
      console.log('second class unfold');
      (await second_class.$$("a"))[0].click();
      await sleep(2000);

      const third_class_selector = `${second_class_selector}:nth-of-type(${
        second_idx + 1
      }) + div`;
      await safe_select(page, `${third_class_selector} a`);
      const third_class_length = (await page.$$(`${third_class_selector} a`))
        .length;

      for (let idx = 0; idx < third_class_length; ++idx) {
        if (fs.existsSync(`v3/${first_idx}/${second_idx}/${idx + 1}`)) {
          console.log("skip", first_idx, second_idx, idx);
          continue;
        }
        const target = await safe_select(
          page,
          `${third_class_selector} a`,
          idx
        );
        const href = await safe_eval(
          page,
          `document.body.querySelectorAll('${third_class_selector} a')[${idx}].getAttribute('href')`,
          (x) => x
        );
        // 先把原来列表total清空，否则点击后无法判断右侧列表是否更新
        await page.evaluate(`(() => {
          const a = document.getElementById("MainContent_MainContent_ListView1_DataPager1_ctl00_TotalRowsLabel");
          if (a) {
           a.innerText="";
          }
        })();
          `);

        // 这里不能模拟点击，否则可能报错
        console.log('third class clicked');
        await page.evaluate(href.replace("javascript:", ""));

        await sleep(2000);

        const total = parseInt(
          await safe_eval(
            page,
            'document.getElementById("MainContent_MainContent_ListView1_DataPager1_ctl00_TotalRowsLabel") && document.getElementById("MainContent_MainContent_ListView1_DataPager1_ctl00_TotalRowsLabel").innerText',
            (x) => !!x
          )
        );
        const n_per_page = 25;
        const total_page = Math.ceil(total / n_per_page);
        let aidx = 0;
        const dir = `v3/${first_idx}/${second_idx}/${idx}`;
        fs.ensureDirSync(dir);
        for (let p = 1; p <= total_page; ++p) {
          if (p !== 1) {
            await safe_select(page, `.nuumerricButton`);
            let target;
            if (!(await page.$$(`.nuumerricButton[value="${p}"]`))[0]) {
              console.log('... clicked')
              target = await safe_select(page, `[value="..."]`, -1);
            } else {
              console.log('next page clicked', p)
              target = await safe_select(
                page,
                `.nuumerricButton[value="${p}"]`
              );
            }
            target.click();
          }

          // 确保成功翻页
          const page_start_idx = await safe_eval(
            page,
            'document.getElementById("MainContent_MainContent_ListView1_DataPager1_ctl00_StartRowLabel").innerText',
            (x) => x && x.toString().trim() === `${(p - 1) * n_per_page + 1}`
          );
          console.log('page start', page_start_idx, 'page', p);

          fs.writeFileSync(
            `v3/${first_idx}/${second_idx}/${idx}/list${p}.html`,
            await page.evaluate("document.body.innerHTML")
          );
          const articles_selector = "#MainContent_MainContent_ListView1_Tr1 a";

          await safe_select(page, articles_selector);

          const article_length = (await page.$$(articles_selector)).length;
          for (let i = 0; i < article_length; ++aidx, ++i) {
            if (fs.existsSync(path.join(dir, aidx + ".html"))) {
              console.log("skip", path.join(dir, aidx + ".html"));
              continue;
            }
            console.log(dir, aidx, total);

            const target = await safe_select(
              page,
              `${articles_selector}`,
              aidx % n_per_page
            );
            console.log('article clicked');
            target.click();

            // 等待加载完成
            await safe_eval(
              page,
              `document.body.innerHTML.indexOf('<script>$("div.demo").scrollTop(300);</script>') >= 0 &&
              document.body.innerHTML.indexOf('文章全文：')>=0 ? 1 : 0
              `,
              (x) => x >= 0
            );

            fs.writeFileSync(
              path.join(dir, aidx + ".html"),
              await safe_eval(
                page,
                `document.body.innerHTML`,
                (x) =>
                  x &&
                  x.indexOf('<script>$("div.demo").scrollTop(300);</script>') >=
                    0 &&
                  x.indexOf("文章全文：") >= 0
              )
            );

            await sleep(1000);
            await page.goBack({ timeout: 3000 });
            await sleep(1000);
          }
        }
      }
    }
  }
  // await page.screenshot();
};

(async () => {
  while (true) {
    try {
      const idx = parseInt(process.env["IDX"] || "0");
      console.log(idx);
      await start(idx);
      break;
    } catch (e) {
      console.log(e);
      await browser.close();
      await sleep(1000);
    }
  }
})();