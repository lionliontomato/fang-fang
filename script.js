const SHEET_ID = '1-4mY86ruT2HnTWpPI9MJ9MYPWVTE_Yi3Zoe3PZIMSbs';
const SHEET_GID = '0';

const TAG_TYPES = ['分類', '歌手', '風格', '語言', '其他'];

let songs = [];
let activeType = '分類';
let activeValue = null;
let query = '';
let sheetTimeout = null;

const palette = [
  ['#6f8795','#edf3f5'],['#7f9aaa','#eef5f4'],['#8da0b6','#f0f3f8'],
  ['#78918b','#eef4f1'],['#a18f99','#f6f1f4'],['#9b947e','#f5f2ea'],
  ['#8393a0','#eef2f5'],['#7795a3','#edf5f7'],['#8f98aa','#f3f4ee'],
  ['#9a8e88','#f6f1ed'],['#7189a8','#edf1f8'],['#6d9a98','#edf6f5']
];

function cell(row, i) {
  const c = row && row.c ? row.c[i] : null;
  return c ? String(c.f || c.v || '').trim() : '';
}

function parseTags(text) {
  return String(text || '')
    .replace(/[｜|／\/;；、，\n\r]/g, ',')
    .split(',')
    .map(t => t.trim())
    .filter(t => t && t !== '-' && t !== '—');
}

function buildTagMap(typeText, valueText, category, artist) {
  const tagMap = {};
  TAG_TYPES.forEach(t => tagMap[t] = []);

  const types = parseTags(typeText);
  const values = parseTags(valueText);

  if (types.length === 1 && values.length > 1) {
    values.forEach(v => tagMap[types[0]]?.push(v));
  } else {
    values.forEach((v, i) => {
      const type = types[i];
      if (TAG_TYPES.includes(type)) {
        tagMap[type].push(v);
      }
    });
  }

  if (!tagMap['分類'].length && category) {
    tagMap['分類'].push(category);
  }

  if (!tagMap['歌手'].length && artist) {
    tagMap['歌手'].push(artist);
  }

  TAG_TYPES.forEach(t => {
    tagMap[t] = Array.from(new Set(tagMap[t]));
  });

  return tagMap;
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
      const rows = response?.table?.rows || [];
      const loadedSongs = [];

      rows.forEach(function(row) {
        const title = cell(row, 0);
        const artist = cell(row, 1);
        const category = cell(row, 2);
        const link = cell(row, 3);

        const typeText = cell(row, 5);   // F欄：分類、歌手、風格、語言、其他
        const valueText = cell(row, 6);  // G欄：對應標籤

        const looksLikeHeader = ['歌名', '歌曲', '曲名', 'title'].includes(title.toLowerCase());

        if (title && !looksLikeHeader) {
          loadedSongs.push({
            title,
            artist: artist || '未填歌手',
            category: category || '未分類',
            link: /^https?:\/\//i.test(link) ? link : '',
            tagMap: buildTagMap(typeText, valueText, category, artist)
          });
        }
      });

      songs = loadedSongs;
      status.textContent = '';
      renderTypes();
      renderValues();
      renderSongs();

    } catch (err) {
      console.error(err);
      showSheetError('試算表格式解析失敗，請確認 F欄是類型、G欄是對應標籤。');
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
  renderTypes();
  renderValues();
  renderSongs();
}

function renderTypes() {
  const box = document.getElementById('typeTabs');
  box.innerHTML = '';

  TAG_TYPES.forEach(function(type) {
    const b = document.createElement('button');
    b.className = 'type-tab' + (activeType === type ? ' active' : '');
    b.textContent = type;

    b.onclick = function() {
      activeType = type;
      activeValue = null;
      renderTypes();
      renderValues();
      renderSongs();
    };

    box.appendChild(b);
  });
}

function getValuesByType(type) {
  const values = [];

  songs.forEach(song => {
    (song.tagMap[type] || []).forEach(v => values.push(v));
  });

  return Array.from(new Set(values)).filter(Boolean);
}

function renderValues() {
  const box = document.getElementById('valueTags');
  box.innerHTML = '';

  const values = getValuesByType(activeType);

  values.forEach(function(value, i) {
    const colors = palette[i % palette.length];
    const b = document.createElement('button');

    b.className = 'tag' + (activeValue === value ? ' active' : '');
    b.textContent = value;
    b.style.setProperty('--tag', colors[0]);
    b.style.setProperty('--tagLight', colors[1]);

    b.onclick = function() {
      activeValue = activeValue === value ? null : value;
      renderValues();
      renderSongs();
    };

    box.appendChild(b);
  });
}

function matchSong(song) {
  const q = query.trim().toLowerCase();

  const allTags = TAG_TYPES
    .flatMap(type => song.tagMap[type] || [])
    .join(' ');

  const text = (
    song.title + ' ' +
    song.artist + ' ' +
    song.category + ' ' +
    allTags
  ).toLowerCase();

  const tagOk = !activeValue || (song.tagMap[activeType] || []).includes(activeValue);

  return tagOk && (!q || text.includes(q));
}

function renderSongs() {
  const grid = document.getElementById('grid');
  const empty = document.getElementById('empty');
  const count = document.getElementById('count');

  grid.innerHTML = '';

  const list = songs.filter(matchSong);

  count.textContent = '共 ' + list.length + ' 首 / 全部 ' + songs.length + ' 首';
  empty.style.display = list.length ? 'none' : 'block';

  list.forEach(function(song) {
    const card = document.createElement('article');
    card.className = 'card';

    const title = document.createElement('h3');
    title.className = 'song';
    title.textContent = song.title;

    const artist = document.createElement('div');
    artist.className = 'artist';
    artist.textContent = song.artist;

    const cat = document.createElement('span');
    cat.className = 'cat';

    const shownTags = [];
    TAG_TYPES.forEach(type => {
      (song.tagMap[type] || []).forEach(v => shownTags.push(v));
    });

    cat.textContent = shownTags.slice(0, 4).join('｜') || song.category || '未分類';

    const copy = document.createElement('button');
    copy.className = 'copy';
    copy.type = 'button';
    copy.textContent = '📋 複製';

    copy.onclick = async function() {
      const text = song.title + ' - ' + song.artist;

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

    if (song.link) {
      card.addEventListener('dblclick', function() {
        window.open(song.link, '_blank', 'noopener,noreferrer');
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
  activeValue = null;
  query = '';
  document.getElementById('search').value = '';
  renderValues();
  renderSongs();
};

document.getElementById('randomBtn').onclick = function(e) {
  e.preventDefault();

  const list = songs.filter(matchSong);
  if (!list.length) return;

  const song = list[Math.floor(Math.random() * list.length)];

  document.getElementById('pickSong').textContent = song.title;
  document.getElementById('pickArtist').textContent = song.artist + '｜' + (song.category || '未分類');
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
