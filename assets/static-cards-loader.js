/* 静态卡面加载（天空之城机械幻想 · 第一批 12 张）
 * 用法：把 assets/cards/000.jpg … 011.jpg 与 cards-meta.json 放进站点后，
 * 用 StaticCards.url(id, w) 替代 DreamCards.url(id, w)。
 * id 超出 0..11 时可回退到程序生成，或只使用这 12 张做测试。
 */
const StaticCards = (() => {
  'use strict';
  const BOX = 12; // 第一批；后续扩到 600 时改这里
  const BASE = 'assets/cards/'; // 相对站点根路径
  const META_URL = 'assets/cards-meta.json';

  let meta = null;
  let metaPromise = null;

  function loadMeta() {
    if (meta) return Promise.resolve(meta);
    if (metaPromise) return metaPromise;
    metaPromise = fetch(META_URL)
      .then((r) => r.json())
      .then((arr) => {
        meta = new Map(arr.map((c) => [c.id, c]));
        return meta;
      })
      .catch((e) => {
        console.warn('StaticCards meta load failed', e);
        meta = new Map();
        return meta;
      });
    return metaPromise;
  }

  function plan(id) {
    id = ((id % BOX) + BOX) % BOX;
    const m = meta && meta.get(id);
    if (!m) {
      return {
        id,
        name: '未命名梦境',
        desc: '一幅尚未醒来的画面。',
        tags: [],
        tpl: 'static',
        theme: '静态',
      };
    }
    return {
      id: m.id,
      name: m.name,
      desc: m.desc,
      tags: m.tags || [],
      tpl: 'static',
      theme: m.name,
      motifs: [],
    };
  }

  const URLS = new Map();
  function url(id, w) {
    id = ((id % BOX) + BOX) % BOX;
    const key = id + '@' + (w || 400);
    if (URLS.has(key)) return Promise.resolve(URLS.get(key));
    const path = BASE + String(id).padStart(3, '0') + '.jpg';
    URLS.set(key, path);
    return Promise.resolve(path);
  }

  function urlNow(id, w) {
    id = ((id % BOX) + BOX) % BOX;
    return URLS.get(id + '@' + (w || 400)) || BASE + String(id).padStart(3, '0') + '.jpg';
  }

  function ready() {
    return loadMeta();
  }

  return { BOX, plan, url, urlNow, ready, loadMeta };
})();

if (typeof module !== 'undefined') module.exports = StaticCards;
