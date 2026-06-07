const SHEET_ID = '1-4mY86ruT2HnTWpPI9MJ9MYPWVTE_Yi3Zoe3PZIMSbs';
const SHEET_GID = '0';

let songs = [];
let activeCategory = null;
let activeArtist = null;
let activeStyle = null;
let query = '';
let sheetTimeout = null;

const palette = [
  ['#6f8795','#edf3f5'],['#7f9aaa','#eef5f4'],['#8da0b6','#f0f3f8'],
  ['#78918b','#eef4f1'],['#a18f99','#f6f1f4'],['#9b947e','#f5f2ea'],
  ['#8393a0','#eef2f5'],['#7795a3','#edf5f7'],['#8f98aa','#f3f4ee'],
  ['#9a8e88','#f6f1ed'],['#7189a8','#edf1f8'],['#6d9a98','#edf6f5'],
  ['#907f9d','#f3eff6'],['#ad928f','#f8f1f0'],['#8ca0a6','#edf3f5']
];

function cell(row, i) {
  const c = row && row.c ? row.c[i] : null;
  return c ? String(c.f || c.v || '').trim() : '';
}

function parseTags(text) {
  return String(text || '')
    .replace(/[｜|／\/;；、，\n\r]/g, ',')
    .split(',')
    .map(function(t) { return t.trim(); })
    .filter(function(t) {
      return t && t !== '-' && t !== '—' && t !== '標籤' && t !== '風格';
    });
}

function loadSheet() {
  const status = document.getElementById('status');
  status.textContent = '讀取中…';

  const oldScript = document.getElementById('sheetJsonp');
  if (oldScript) oldScript.remove();

  const callbackName = 'playlistSheetCallback_' + Date.now();
  const url = 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/gviz/tq?gid=' + SHEET_GID + '&tqx=out:json;responseHandler:' + callbackName + '&t=' + Date.now();

  window[callbackName] = function(response) {
    clearTimeout(sheetTimeout);

    try {
      const rows = response && response.table && response.table.rows ? response.table.rows : [];
      const loadedSongs = [];

      rows.forEach(function(row) {
        const title = cell(row, 0);      // A欄：歌名
        const artist = cell(row, 1);     // B欄：歌手
        const category = cell(row, 2);   // C欄：分類
        const link = cell(row, 3);       // D欄：連結
        const style = cell(row, 6);      // G欄：風格

        const looksLikeHeader = ['歌名', '歌曲', '曲名', 'title'].includes(title.toLowerCase());

        if (title && !looksLikeHeader) {
          loadedSongs.push({
            title: title,
            artist: artist || '未填歌手',
            category: category || '未分類',
            style: style || '',
            link: /^https?:\/\//i.test(link) ? link : ''
          });
        }
      });

      songs = loadedSongs;

      status.textContent = '';
      renderTags();
      renderSongs();

    } catch (err) {
      console.error(err);
      showSheetError('試算表格式解析失敗，請確認 A欄歌名、B欄歌手、C欄分類、D欄連結、G欄風格。');
    } finally {
      delete window[callbackName];
      const s = document.getElementById('sheetJsonp');
      if (s) s.remove();
    }
  };

  const script = document.createElement('script');
  script.id = 'sheetJsonp';
  script.src = url;

  script.onerror = function() {
    clearTimeout(sheetTimeout);
    showSheetError('讀取不到試算表，請確認共用權限是「知道連結的任何人可檢視」。');
    delete window[callbackName];
  };

  document.body.appendChild(script);

  sheetTimeout = setTimeout(function() {
    showSheetError('讀取試算表逾時，請重新整理頁面或確認試算表權限。');
    delete window[callbackName];
  }, 12000);
}

function showSheetError(message) {
  songs = [];
  document.getElementById('status').textContent = message;
  renderTags();
  renderSongs();
}

function uniqueValues(type) {
  const values = [];

  songs.forEach(function(s) {
    if (type === 'category') {
      parseTags(s.category).forEach(function(t) {
        values.push(t);
      });
    }

    if (type === 'artist') {
      values.push(s.artist);
    }

    if (type === 'style') {
      parseTags(s.style).forEach(function(t) {
        values.push(t);
      });
    }
  });

  return Array.from(new Set(values)).filter(Boolean);
}

function renderFilterBox(id, values, activeValue, onClick) {
  const box = document.getElementById(id);
  if (!box) return;

  box.innerHTML = '';

  values.forEach(function(t, i) {
    const colors = palette[i % palette.length];
    const b = document.createElement('button');

    b.className = 'tag' + (activeValue === t ? ' active' : '');
    b.textContent = t;
    b.style.setProperty('--tag', colors[0]);
    b.style.setProperty('--tagLight', colors[1]);

    b.onclick = function() {
      onClick(t);
      renderTags();
      renderSongs();
    };

    box.appendChild(b);
  });
}

function renderTags() {
  renderFilterBox('categoryTags', uniqueValues('category'), activeCategory, function(t) {
    activeCategory = activeCategory === t ? null : t;
  });

  renderFilterBox('artistTags', uniqueValues('artist'), activeArtist, function(t) {
    activeArtist = activeArtist === t ? null : t;
  });

  renderFilterBox('styleTags', uniqueValues('style'), activeStyle, function(t) {
    activeStyle = activeStyle === t ? null : t;
  });
}

function matchSong(s) {
  const q = query.trim().toLowerCase();

  const categories = parseTags(s.category);
  const styles = parseTags(s.style);

  const text = (
    s.title + ' ' +
    s.artist + ' ' +
    s.category + ' ' +
    s.style
  ).toLowerCase();

  const categoryOk = !activeCategory || categories.includes(activeCategory);
  const artistOk = !activeArtist || s.artist === activeArtist;
  const styleOk = !activeStyle || styles.includes(activeStyle);

  return categoryOk && artistOk && styleOk && (!q || text.includes(q));
}

function renderSongs() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  grid.innerHTML = '';

  const list = songs.filter(matchSong);

  count.textContent = '共 ' + list.length + ' 首 / 全部 ' + songs.length + ' 首';
  empty.style.display = list.length ? 'none' : 'block';

  list.forEach(function(s) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.title = s.title;

    const title = document.createElement('h3');
    title.className = 'song';
    title.textContent = s.title;

    const artist = document.createElement('div');
    artist.className = 'artist';
    artist.textContent = s.artist;

    const cat = document.createElement('span');
    cat.className = 'cat';

    const categoryText = parseTags(s.category).join('　') || '未分類';
    const styleText = parseTags(s.style).join('　');

    cat.textContent = styleText ? categoryText + '｜' + styleText : categoryText;

    const copy = document.createElement('button');
    copy.className = 'copy';
    copy.type = 'button';
    copy.textContent = '📋 複製';

    copy.onclick = async function() {
      const text = s.title + ' - ' + s.artist;

      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }

      copy.textContent = '✓ 已複製';
      copy.classList.add('done');

      setTimeout(function() {
        copy.textContent = '📋 複製';
        copy.classList.remove('done');
      }, 1300);
    };

    card.append(title, artist, cat, copy);

    if (s.link) {
      card.addEventListener('dblclick', function() {
        window.open(s.link, '_blank', 'noopener,noreferrer');
      });
      card.title = '雙擊開啟歌曲連結';
    }

    grid.appendChild(card);
  });
}

document.getElementById('search').addEventListener('input', function(e) {
  query = e.target.value;
  renderSongs();
});

document.getElementById('clearFilters').onclick = function() {
  activeCategory = null;
  activeArtist = null;
  activeStyle = null;
  query = '';

  document.getElementById('search').value = '';

  renderTags();
  renderSongs();
};

document.getElementById('randomBtn').onclick = function(e) {
  e.preventDefault();

  const list = songs.filter(matchSong);
  if (!list.length) return;

  const s = list[Math.floor(Math.random() * list.length)];

  const categoryText = parseTags(s.category).join('　') || '未分類';
  const styleText = parseTags(s.style).join('　');

  document.getElementById('pickSong').textContent = s.title;
  document.getElementById('pickArtist').textContent =
    s.artist + '｜' + categoryText + (styleText ? '｜' + styleText : '');

  document.getElementById('modal').classList.add('show');
};

document.getElementById('closeModal').onclick = function() {
  document.getElementById('modal').classList.remove('show');
};

document.getElementById('modal').onclick = function(e) {
  if (e.target.id === 'modal') {
    e.currentTarget.classList.remove('show');
  }
};

(function floats() {
  const symbols = ['🌸','🎵','🎶','♬','✦'];
  const layer = document.getElementById('floatLayer');

  for (let i = 0; i < 28; i++) {
    const el = document.createElement('span');
    el.className = 'float';
    el.textContent = symbols[i % symbols.length];
    el.style.setProperty('--left', Math.random() * 100 + '%');
    el.style.setProperty('--dur', (10 + Math.random() * 14) + 's');
    el.style.setProperty('--delay', (-Math.random() * 16) + 's');
    layer.appendChild(el);
  }
})();

loadSheet();
