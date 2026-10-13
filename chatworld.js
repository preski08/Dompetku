/* ============================================================
   CHAT WORLD — Dompetku
   Chat bebas dalam radius GPS tanpa harus tahu ID.
   Bisa add teman (friend) lalu buka chat normal.
   ============================================================ */
(function () {
  'use strict';

  var DEFAULT_RADIUS_KM = 15;
  var DEFAULT_LAT = -6.175392, DEFAULT_LNG = 106.827153;
  var FRIENDS_KEY = 'dk_friends';
  var PRESENCE_KEY = 'dk_cw_presence';
  var myLat = DEFAULT_LAT, myLng = DEFAULT_LNG, gpsReady = false;

  function rd(k, d) {
    try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; }
  }
  function wr(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {
      alert('Penyimpanan penuh.');
    }
  }
  function getUserId() {
    var s = rd('dk_session', null);
    return s && s.id ? s.id : null;
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getFriends(uid) {
    var all = rd(FRIENDS_KEY, {});
    return all[uid] || {};
  }
  function isFriend(a, b) {
    if (!a || !b) return false;
    return !!(getFriends(a)[b] || getFriends(b)[a]);
  }
  function addFriend(fromId, toId) {
    if (!fromId || !toId || fromId === toId) return false;
    var all = rd(FRIENDS_KEY, {});
    if (!all[fromId]) all[fromId] = {};
    all[fromId][toId] = { ts: Date.now() };
    if (!all[toId]) all[toId] = {};
    all[toId][fromId] = { ts: Date.now(), from: fromId };
    wr(FRIENDS_KEY, all);
    return true;
  }

  function updatePresence() {
    var uid = getUserId();
    if (!uid) return;
    var all = rd(PRESENCE_KEY, {});
    all[uid] = {
      id: uid,
      lat: myLat,
      lng: myLng,
      ts: Date.now(),
      online: true
    };
    // cleanup stale > 30 min
    var now = Date.now();
    Object.keys(all).forEach(function (k) {
      if (now - (all[k].ts || 0) > 30 * 60 * 1000) delete all[k];
    });
    wr(PRESENCE_KEY, all);
  }

  function getNearbyPresence(radiusKm) {
    var me = getUserId();
    var all = rd(PRESENCE_KEY, {});
    var list = [];
    Object.keys(all).forEach(function (k) {
      var p = all[k];
      if (!p || p.id === me) return;
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return;
      var dist = haversineKm(myLat, myLng, p.lat, p.lng);
      if (dist <= radiusKm) {
        p._dist = dist;
        list.push(p);
      }
    });
    // also include Go Work listings as "nearby people"
    try {
      var listings = rd('dk_gowork_listings', []);
      if (!Array.isArray(listings)) listings = [];
      listings.forEach(function (w) {
        if (!w || !w.userId || w.userId === me) return;
        if (list.some(function (x) { return x.id === w.userId; })) return;
        if (typeof w.lat !== 'number' || typeof w.lng !== 'number') return;
        var dist = haversineKm(myLat, myLng, w.lat, w.lng);
        if (dist <= radiusKm) {
          list.push({ id: w.userId, lat: w.lat, lng: w.lng, ts: w.updatedAt || Date.now(), online: !!w.online, _dist: dist, skills: w.skills });
        }
      });
    } catch (e) {}
    // demo presence if empty (so UI not blank)
    if (!list.length) {
      var demos = [
        { id: 'budi44', lat: myLat + 0.01, lng: myLng - 0.008, online: true },
        { id: 'andiservice', lat: myLat - 0.008, lng: myLng + 0.01, online: true },
        { id: 'tukanglistrik', lat: myLat + 0.005, lng: myLng + 0.006, online: true },
        { id: 'jokoelektronik', lat: myLat - 0.012, lng: myLng - 0.005, online: false }
      ];
      demos.forEach(function (d) {
        d._dist = haversineKm(myLat, myLng, d.lat, d.lng);
        if (d._dist <= radiusKm) list.push(d);
      });
    }
    list.sort(function (a, b) { return a._dist - b._dist; });
    return list;
  }

  function injectCSS() {
    if (document.getElementById('cw-styles')) return;
    var s = document.createElement('style');
    s.id = 'cw-styles';
    s.textContent = `
      .cw-overlay {
        display:none;position:fixed;inset:0;
        background:rgba(8,8,12,.92);backdrop-filter:blur(8px);
        z-index:99998;justify-content:center;align-items:center;
        padding:16px;box-sizing:border-box;font-family:inherit;color:#F4F4F5;
      }
      .cw-overlay.cw-open{display:flex}
      .cw-modal {
        background:linear-gradient(180deg,#1a1a28,#12121c);
        width:100%;max-width:420px;border-radius:22px;padding:22px;
        position:relative;max-height:90vh;overflow-y:auto;
        box-shadow:0 24px 60px rgba(0,0,0,.65);
        border:1px solid rgba(245,158,11,.25);box-sizing:border-box;
      }
      .cw-close {
        position:absolute;top:12px;right:14px;
        background:rgba(255,255,255,.06);border:none;color:#94a3b8;
        width:34px;height:34px;border-radius:10px;font-size:20px;cursor:pointer;
      }
      .cw-title{text-align:center;margin:0 0 4px;font-size:20px;font-weight:800}
      .cw-sub{text-align:center;color:#8B8B9C;font-size:13px;margin:0 0 16px}
      .cw-note{
        background:rgba(245,158,11,.12);border:1px solid rgba(245,158,11,.3);
        color:#FCD34D;font-size:12px;padding:10px 12px;border-radius:12px;
        margin-bottom:12px;line-height:1.4;
      }
      .cw-row{display:flex;gap:8px;margin-bottom:12px;align-items:center}
      .cw-row select{
        background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);
        color:#fff;border-radius:10px;padding:8px 12px;font-family:inherit;
      }
      .cw-btn{
        padding:8px 14px;border:none;border-radius:10px;font-weight:700;
        font-size:12px;cursor:pointer;font-family:inherit;
      }
      .cw-btn-gps{background:rgba(255,255,255,.08);color:#E9EDEF}
      .cw-btn-chat{background:#25D366;color:#0B141A;flex:1}
      .cw-btn-friend{background:rgba(29,155,240,.25);color:#93C5FD}
      .cw-card{
        background:rgba(255,255,255,.04);padding:14px;border-radius:14px;
        margin-bottom:10px;border:1px solid rgba(255,255,255,.07);
      }
      .cw-card h4{margin:0 0 4px;font-size:14px;color:#E9EDEF}
      .cw-card .cw-dist{font-size:11px;color:#8B8B9C}
      .cw-card .cw-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
      .cw-empty{color:#8B8B9C;font-size:13px;text-align:center;padding:20px}
      .cw-badge{display:inline-block;width:8px;height:8px;border-radius:50%;background:#10b981;margin-right:5px;box-shadow:0 0 6px #10b981}
      .cw-badge.off{background:#6b7280;box-shadow:none}
      .cw-friend-tag{font-size:10px;color:#F59E0B;font-weight:700;margin-left:6px}
    `;
    document.head.appendChild(s);
  }

  function injectModal() {
    if (document.getElementById('cwOverlay')) return;
    var div = document.createElement('div');
    div.innerHTML =
      '<div class="cw-overlay" id="cwOverlay">' +
        '<div class="cw-modal">' +
          '<button class="cw-close" type="button" onclick="CW_close()">&times;</button>' +
          '<h2 class="cw-title">🌍 Chat World</h2>' +
          '<p class="cw-sub">Chat bebas · radius GPS · tanpa harus tahu ID</p>' +
          '<div class="cw-note">Aktifkan GPS agar muncul orang terdekat. Chat langsung gratis. Klik <b>Add Teman</b> agar bisa chat ulang lewat menu Chat.</div>' +
          '<div class="cw-row">' +
            '<span style="font-size:12px;color:#8B8B9C">Radius</span>' +
            '<select id="cwRadius">' +
              '<option value="5">5 km</option>' +
              '<option value="10">10 km</option>' +
              '<option value="15" selected>15 km</option>' +
              '<option value="25">25 km</option>' +
              '<option value="50">50 km</option>' +
            '</select>' +
            '<button type="button" class="cw-btn cw-btn-gps" onclick="CW_gps()">📍 GPS</button>' +
            '<button type="button" class="cw-btn cw-btn-gps" onclick="CW_refresh()">🔄</button>' +
          '</div>' +
          '<div id="cwList"></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div.firstChild);
  }

  function requestGPS(cb) {
    if (!navigator.geolocation) {
      alert('Browser tidak support GPS.');
      if (cb) cb(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(function (pos) {
      myLat = pos.coords.latitude;
      myLng = pos.coords.longitude;
      gpsReady = true;
      updatePresence();
      if (cb) cb(true);
    }, function (err) {
      alert('Gagal ambil lokasi: ' + err.message);
      if (cb) cb(false);
    }, { enableHighAccuracy: true, timeout: 12000 });
  }

  function renderList() {
    var box = document.getElementById('cwList');
    if (!box) return;
    var radius = parseFloat((document.getElementById('cwRadius') || {}).value) || DEFAULT_RADIUS_KM;
    updatePresence();
    var list = getNearbyPresence(radius);
    var me = getUserId();
    if (!list.length) {
      box.innerHTML = '<p class="cw-empty">Tidak ada orang dalam radius ' + radius +
        ' km.<br><br>Aktifkan GPS, atau minta teman buka Chat World juga.</p>';
      return;
    }
    box.innerHTML = '';
    list.forEach(function (p) {
      var distTxt = p._dist < 1 ? Math.round(p._dist * 1000) + ' m' : p._dist.toFixed(1) + ' km';
      var friend = isFriend(me, p.id);
      var card = document.createElement('div');
      card.className = 'cw-card';
      card.innerHTML =
        '<h4><span class="cw-badge ' + (p.online ? '' : 'off') + '"></span>' +
          escapeHtml(p.id) +
          (friend ? '<span class="cw-friend-tag">✓ Teman</span>' : '') +
        '</h4>' +
        '<p class="cw-dist">📍 ' + distTxt + (p.skills ? ' · ' + escapeHtml((p.skills || []).join(', ')) : '') + '</p>' +
        '<div class="cw-actions">' +
          '<button type="button" class="cw-btn cw-btn-chat" data-uid="' + escapeHtml(p.id) + '">💬 Chat</button>' +
          (friend
            ? '<button type="button" class="cw-btn cw-btn-friend" disabled>Sudah Teman</button>'
            : '<button type="button" class="cw-btn cw-btn-friend" data-add="' + escapeHtml(p.id) + '">+ Add Teman</button>') +
        '</div>';
      box.appendChild(card);
    });
    box.querySelectorAll('[data-uid]').forEach(function (btn) {
      btn.onclick = function () { openChatFree(this.getAttribute('data-uid')); };
    });
    box.querySelectorAll('[data-add]').forEach(function (btn) {
      btn.onclick = function () {
        var tid = this.getAttribute('data-add');
        if (addFriend(me, tid)) {
          alert('✅ ' + tid + ' ditambahkan sebagai teman.');
          renderList();
        }
      };
    });
  }

  function openChatFree(uid) {
    var me = getUserId();
    if (!me) { alert('Login dulu'); return; }
    if (uid === me) { alert('Tidak bisa chat diri sendiri'); return; }
    // ensure user exists (ghost ok)
    try {
      var users = rd('dk_users', []);
      if (!users.some(function (u) { return u.id === uid; })) {
        users.push({ id: uid, pw: '', balance: 0, created: Date.now(), ghost: true });
        wr('dk_users', users);
      }
    } catch (e) {}
    // free connection if needed (no fee for Chat World)
    if (typeof window.dkHasConnection === 'function' && !window.dkHasConnection(me, uid)) {
      if (typeof window.dkOpenConnection === 'function') {
        // open with fee 0 by using already path: mark connection free
        try {
          var CONN_KEY = 'dk_connections';
          var all = rd(CONN_KEY, {});
          if (!all[me]) all[me] = {};
          all[me][uid] = { ts: Date.now(), fee: 0, source: 'chatworld' };
          if (!all[uid]) all[uid] = {};
          all[uid][me] = { ts: Date.now(), fee: 0, from: me, source: 'chatworld' };
          wr(CONN_KEY, all);
        } catch (e) {}
      }
    }
    closeCW();
    if (typeof window.dkChatOpen === 'function') {
      window.dkChatOpen();
      setTimeout(function () {
        var inp = document.getElementById('dkc-nwid');
        if (inp) {
          var dlg = document.getElementById('dkc-dlg');
          if (dlg) dlg.classList.add('active');
          inp.value = uid;
          // auto start if possible
          var st = document.getElementById('dkc-nwst');
          if (st) { st.style.color = '#25D366'; st.textContent = '✓ Membuka...'; }
          setTimeout(function () {
            if (dlg) dlg.classList.remove('active');
            // trigger open room via internal if available
            if (typeof window.dkChatOpenRoom === 'function') {
              window.dkChatOpenRoom(uid);
            }
          }, 250);
        }
      }, 400);
    } else {
      alert('Chat siap. Buka menu Chat lalu ketik ID: ' + uid);
    }
  }

  function openCW() {
    if (!getUserId()) { alert('Login dulu'); return; }
    injectCSS();
    injectModal();
    document.getElementById('cwOverlay').classList.add('cw-open');
    if (!gpsReady) {
      requestGPS(function () { renderList(); });
    } else {
      updatePresence();
      renderList();
    }
  }
  function closeCW() {
    var el = document.getElementById('cwOverlay');
    if (el) el.classList.remove('cw-open');
  }

  window.CW_open = openCW;
  window.CW_close = closeCW;
  window.CW_gps = function () { requestGPS(function () { renderList(); }); };
  window.CW_refresh = function () { renderList(); };

  // periodic presence while logged in
  setInterval(function () {
    if (getUserId() && gpsReady) updatePresence();
  }, 60000);

  console.log('[ChatWorld] radius GPS + free chat + friends ✅');
})();
