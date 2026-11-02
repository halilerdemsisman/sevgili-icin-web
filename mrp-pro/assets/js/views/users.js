/* ==========================================================================
   MRP Pro — Kullanıcılar & Roller, bölüm yetki matrisi, firma ayarları (logo)
   ========================================================================== */
(function (MRP) {
    'use strict';
    const U = MRP.U, UI = MRP.UI, H = MRP.H, A = MRP.auth;
    const esc = U.esc;
    const S = () => MRP.store.state;
    const app = () => MRP.app;
    const C = MRP.config;

    const MAX_LOGO_BYTES = 300 * 1024;
    const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    const uState = { tab: 'matrix' };

    const roles = () => S().roles || [];
    const users = () => S().users || [];
    const roleName = (id) => (roles().find((r) => r.id === id) || {}).name || id;
    const permGroups = () => {
        const g = {};
        Object.entries(A.PERMISSIONS).forEach(([k, [grp, label]]) => { (g[grp] = g[grp] || []).push([k, label]); });
        return g;
    };
    const limitText = (r) => (!r.can.approveRequest ? '–' : r.approveLimit == null ? 'Sınırsız' : U.cur(r.approveLimit, 0));
    const editable = () => !C.erp && A.can('manageUsers');

    MRP.views.users = {
        title: 'Kullanıcılar & Roller',
        subtitle: 'Bölüm rolleri, ekran erişimi, işlem yetkileri ve firma ayarları',
        render() {
            const tabs = [['matrix', 'Yetki Matrisi'], ['roles', 'Roller', roles().length], ['users', 'Kullanıcılar', users().length], ['brand', 'Firma Ayarları']];
            let html = H.tabs(tabs, uState.tab, 'usrTab');
            if (C.erp && uState.tab !== 'brand') {
                html += H.banner('blue', 'info', 'Kullanıcılar ve roller ERP\'de yönetiliyor', 'ERP modunda oturum ve yetkiler ERP\'den gelir (GET /auth/me). Aşağıda yalnızca sizin yetkileriniz gösterilir; değişiklikleri ERP\'nin kullanıcı yönetiminden yapın.');
                return html + myPermissions();
            }
            if (uState.tab === 'matrix') html += matrix();
            else if (uState.tab === 'roles') html += roleList();
            else if (uState.tab === 'users') html += userList();
            else html += branding();
            return html;
        }
    };

    function myPermissions() {
        const me = A.current();
        return H.card(`${me.name} — ${me.roleName}`, `Açılış ekranı: ${A.VIEWS[me.home] || me.home}`, `<div class="card-body grid grid-2">
            <div><h3 style="font-size:.85em;margin-bottom:8px;">Erişilen ekranlar</h3><div class="chips">${me.views.map((v) => `<span class="badge badge-blue plain">${esc(A.VIEWS[v] || v)}</span>`).join('')}</div></div>
            <div><h3 style="font-size:.85em;margin-bottom:8px;">İşlem yetkileri</h3><div class="chips">${Object.entries(A.PERMISSIONS).filter(([k]) => me.can[k]).map(([, [, l]]) => `<span class="badge badge-green plain">${esc(l)}</span>`).join('') || '<span class="muted">Salt okunur</span>'}</div>
            ${me.can.approveRequest ? `<p style="margin-top:10px;font-size:.85em;">Onay limiti: <b>${me.can.approveLimit === Infinity ? 'Sınırsız' : U.cur(me.can.approveLimit, 0)}</b></p>` : ''}</div></div>`);
    }

    // ---------------- Yetki matrisi ----------------
    function matrix() {
        const rs = roles();
        const yes = '<span style="color:var(--green);font-weight:800;">●</span>';
        const ro = '<span style="color:var(--text-3);" title="Salt okunur">○</span>';
        // Bir ekranda "yazma" sayılan yetkiler — matriste ● (düzenler) / ○ (görür) ayrımı için
        const WRITE = {
            bom: ['editProduct'], items: ['editItem', 'editCost'], costing: ['editCost'], mrp: ['runMRP', 'createRequest'], capacity: ['manageCapacity'],
            workorders: ['manageWO'], requests: ['approveRequest', 'createRequest'], po: ['createPO', 'receiveGoods'], suppliers: ['manageSuppliers'],
            stock: ['adjustStock', 'transferStock'], import: ['editItem', 'editProduct', 'adjustStock', 'runMRP', 'manageSuppliers'], users: ['manageUsers']
        };
        return `<p class="muted" style="font-size:.82em;margin-bottom:10px;">● ekranı görür ve kendi sorumluluğundaki işlemleri yapar · ○ yalnızca görür · boş: erişemez. Rolleri değiştirmek için "Roller" sekmesi.</p>
            <section class="card"><div class="table-wrap"><table>
            <thead><tr><th>Ekran</th>${rs.map((r) => `<th class="num" style="text-align:center;">${esc(r.name)}</th>`).join('')}</tr></thead>
            <tbody>${Object.entries(A.VIEWS).map(([v, label]) => `<tr><td class="strong">${esc(label)}</td>${rs.map((r) => {
                if (!r.views.includes(v)) return '<td></td>';
                const w = (WRITE[v] || []).some((p) => r.can[p]);
                return `<td style="text-align:center;">${w ? yes : ro}${r.home === v ? ' <span class="badge badge-amber plain" title="Açılış ekranı">ana</span>' : ''}</td>`;
            }).join('')}</tr>`).join('')}
            <tr class="total"><td>Satın alma onay limiti</td>${rs.map((r) => `<td style="text-align:center;">${limitText(r)}</td>`).join('')}</tr>
            <tr class="total"><td>Kullanıcı sayısı</td>${rs.map((r) => `<td style="text-align:center;">${users().filter((u) => u.role === r.id && u.active !== false).length}</td>`).join('')}</tr>
            </tbody></table></div></section>`;
    }

    // ---------------- Roller ----------------
    function roleList() {
        const can = editable();
        return `<div class="toolbar"><span class="spacer"></span>${can ? `<button class="btn btn-primary" data-act="roleEdit">${MRP.icon('plus')} Yeni Rol</button>` : ''}</div>
            <div class="cards">${roles().map((r) => `<article class="doc-card" style="--doc-c:var(--accent);">
                <div class="h"><div><b style="font-family:inherit;font-size:1em;">${esc(r.name)}</b><div class="muted mono" style="font-size:.78em;margin-top:3px;">${esc(r.id)}</div></div>
                    <span class="badge badge-gray plain">${users().filter((u) => u.role === r.id && u.active !== false).length} kullanıcı</span></div>
                <div class="meta"><div><span>Açılış ekranı</span>${esc(A.VIEWS[r.home] || r.home)}</div><div><span>Ekran</span>${r.views.length}</div>
                    <div><span>İşlem yetkisi</span>${Object.keys(A.PERMISSIONS).filter((k) => r.can[k]).length}</div><div><span>Onay limiti</span>${limitText(r)}</div></div>
                <div class="chips" style="gap:4px;">${Object.entries(A.PERMISSIONS).filter(([k]) => r.can[k]).map(([, [, l]]) => `<span class="badge badge-green plain" style="font-size:.68em;">${esc(l)}</span>`).join('') || '<span class="muted" style="font-size:.8em;">Salt okunur rol</span>'}</div>
                ${can ? `<div class="acts"><button class="btn btn-secondary btn-sm" data-act="roleEdit" data-id="${esc(r.id)}">${MRP.icon('edit', 'sm')} Düzenle</button>
                    ${r.id !== 'admin' ? `<button class="btn btn-ghost btn-sm" data-act="roleDelete" data-id="${esc(r.id)}">${MRP.icon('trash', 'sm')}</button>` : ''}</div>` : ''}
            </article>`).join('')}</div>`;
    }

    function roleEdit(id) {
        if (!editable()) return H.guard('manageUsers');
        const isNew = !id;
        const r = isNew ? { id: '', name: '', home: 'dashboard', views: ['dashboard'], can: {}, approveLimit: 0 } : roles().find((x) => x.id === id);
        const lockAdmin = r.id === 'admin';
        const groups = permGroups();
        UI.modal({
            title: isNew ? 'Yeni Rol' : `Rol — ${r.name}`, size: 'lg',
            body: `<div class="form-grid">
                <div class="field"><label>Rol kodu <span class="req">*</span></label><input id="rlId" value="${esc(r.id)}" ${isNew ? '' : 'readonly'} placeholder="kalite" maxlength="24"></div>
                <div class="field"><label>Rol / bölüm adı <span class="req">*</span></label><input id="rlName" value="${esc(r.name)}" placeholder="Kalite Kontrol"></div>
                <div class="field"><label>Açılış ekranı</label><select id="rlHome">${Object.entries(A.VIEWS).map(([v, l]) => `<option value="${v}" ${r.home === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
                <div class="field"><label>Onay limiti (₺)</label><input id="rlLimit" type="number" min="0" step="1000" value="${r.approveLimit == null ? '' : r.approveLimit}" placeholder="Boş = sınırsız"><span class="hint">Yalnızca "talep onaylama" yetkisiyle geçerlidir.</span></div>
            </div>
            <div class="form-section"><h3>Görebileceği ekranlar</h3><div class="chips">${Object.entries(A.VIEWS).map(([v, l]) => `<label class="check-chip"><input type="checkbox" class="rl-view" value="${v}" ${r.views.includes(v) ? 'checked' : ''} ${lockAdmin && v === 'users' ? 'disabled' : ''}> ${esc(l)}</label>`).join('')}</div></div>
            <div class="form-section"><h3>İşlem yetkileri</h3>
                ${Object.entries(groups).map(([g, list]) => `<div style="margin-bottom:10px;"><div class="muted" style="font-size:.76em;font-weight:700;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">${esc(g)}</div>
                    <div class="chips">${list.map(([k, l]) => `<label class="check-chip"><input type="checkbox" class="rl-perm" value="${k}" ${r.can[k] ? 'checked' : ''} ${lockAdmin && k === 'manageUsers' ? 'disabled' : ''}> ${esc(l)}</label>`).join('')}</div></div>`).join('')}
            </div>
            ${lockAdmin ? '<p class="muted" style="font-size:.8em;">Sistem yöneticisi rolünden kullanıcı yönetimi kaldırılamaz (kilitlenmeyi önlemek için).</p>' : ''}`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const rid = ctx.$('#rlId').value.trim().toLowerCase();
                    const name = ctx.$('#rlName').value.trim();
                    if (!/^[a-z0-9_]{2,24}$/.test(rid)) { UI.toast('Geçersiz rol kodu', 'Küçük harf, rakam ve _ (2–24 karakter).', 'warn'); return false; }
                    if (!name) { UI.toast('Rol adı gerekli', '', 'warn'); return false; }
                    if (isNew && roles().some((x) => x.id === rid)) { UI.toast('Rol kodu kullanımda', rid, 'warn'); return false; }
                    const views = ctx.$$('.rl-view:checked').map((c) => c.value).concat(lockAdmin ? ['users'] : []);
                    if (!views.length) { UI.toast('En az bir ekran seçin', '', 'warn'); return false; }
                    const can = Object.fromEntries(Object.keys(A.PERMISSIONS).map((k) => [k, false]));
                    ctx.$$('.rl-perm:checked').forEach((c) => { can[c.value] = true; });
                    if (lockAdmin) can.manageUsers = true;
                    let home = ctx.$('#rlHome').value;
                    if (!views.includes(home)) home = views[0];
                    const limRaw = ctx.$('#rlLimit').value.trim();
                    const rec = { id: rid, name, home, views: [...new Set(views)], can, approveLimit: limRaw === '' ? null : Math.max(0, U.toNum(limRaw)) };
                    if (isNew) S().roles.push(rec); else Object.assign(r, rec);
                    MRP.store.audit(isNew ? 'Rol eklendi' : 'Rol güncellendi', `${rid}: ${views.length} ekran, ${Object.values(can).filter(Boolean).length} yetki, limit ${rec.approveLimit == null ? 'sınırsız' : rec.approveLimit}`);
                    app().commit();
                    UI.toast('Rol kaydedildi', name, 'success');
                }
            }]
        });
    }

    async function roleDelete(id) {
        if (!editable()) return H.guard('manageUsers');
        const n = users().filter((u) => u.role === id).length;
        if (n) return UI.toast('Rol silinemez', `${n} kullanıcı bu role atanmış; önce başka role taşıyın.`, 'warn');
        if (!(await UI.confirm(`"${roleName(id)}" rolü silinecek.`, { title: 'Rolü sil', okLabel: 'Sil', danger: true }))) return;
        S().roles = roles().filter((r) => r.id !== id);
        MRP.store.audit('Rol silindi', id);
        app().commit();
    }

    // ---------------- Kullanıcılar ----------------
    function userList() {
        const can = editable();
        return `<div class="toolbar"><span class="spacer"></span>${can ? `<button class="btn btn-primary" data-act="userEdit">${MRP.icon('plus')} Yeni Kullanıcı</button>` : ''}</div>
            <section class="card"><div class="table-wrap"><table><thead><tr><th>Kullanıcı adı</th><th>Ad soyad</th><th>Rol / bölüm</th><th>Açılış ekranı</th><th>Durum</th><th>Parola</th><th></th></tr></thead><tbody>
            ${users().map((u) => {
                const r = roles().find((x) => x.id === u.role);
                const demo = u.demoPassword && u.passwordHash === A.hashPassword(u.username, u.demoPassword);
                return `<tr class="${u.active === false ? 'r-warn' : ''}"><td class="mono">${esc(u.username)}</td><td class="strong">${esc(u.name)}</td><td>${esc(roleName(u.role))}</td>
                    <td>${esc(r ? A.VIEWS[r.home] || r.home : '–')}</td>
                    <td>${u.active === false ? '<span class="badge badge-gray">Pasif</span>' : '<span class="badge badge-green">Aktif</span>'}</td>
                    <td>${demo ? '<span class="badge badge-amber" title="Varsayılan demo parolası — değiştirin">Demo parolası</span>' : '<span class="badge badge-green plain">Özel</span>'}</td>
                    <td>${can ? `<button class="btn btn-ghost btn-sm" data-act="userEdit" data-id="${esc(u.username)}">${MRP.icon('edit', 'sm')}</button>` : ''}</td></tr>`;
            }).join('')}</tbody></table></div></section>
            <p class="muted" style="font-size:.78em;margin-top:10px;">Parolalar yalnızca SHA-256 özeti olarak saklanır. Bağımsız mod tek tarayıcıda çalışan bir demo kurulumudur; çok kullanıcılı gerçek kullanımda ERP modunda kimlik doğrulama sunucuda yapılır.</p>`;
    }

    function userEdit(username) {
        if (!editable()) return H.guard('manageUsers');
        const isNew = !username;
        const u = isNew ? { username: '', name: '', role: roles()[1] ? roles()[1].id : 'admin', active: true } : users().find((x) => x.username === username);
        const isMe = !isNew && u.username === A.current().username;
        UI.modal({
            title: isNew ? 'Yeni Kullanıcı' : `Kullanıcı — ${u.username}`, size: 'md',
            body: `<div class="form-grid">
                <div class="field"><label>Kullanıcı adı <span class="req">*</span></label><input id="usName" value="${esc(u.username)}" ${isNew ? '' : 'readonly'} autocomplete="off" maxlength="40"></div>
                <div class="field"><label>Ad soyad <span class="req">*</span></label><input id="usFull" value="${esc(u.name)}"></div>
                <div class="field"><label>Rol / bölüm</label><select id="usRole" ${isMe ? 'disabled' : ''}>${roles().map((r) => `<option value="${esc(r.id)}" ${u.role === r.id ? 'selected' : ''}>${esc(r.name)}</option>`).join('')}</select>
                    ${isMe ? '<span class="hint">Kendi rolünüzü değiştiremezsiniz.</span>' : ''}</div>
                <div class="field"><label>Durum</label><select id="usActive" ${isMe ? 'disabled' : ''}><option value="1" ${u.active !== false ? 'selected' : ''}>Aktif</option><option value="0" ${u.active === false ? 'selected' : ''}>Pasif (giriş yapamaz)</option></select></div>
                <div class="field full"><label>${isNew ? 'Parola <span class="req">*</span>' : 'Yeni parola (boş = değişmez)'}</label><input id="usPass" type="password" autocomplete="new-password" minlength="6"><span class="hint">En az 6 karakter.</span></div>
            </div>`,
            buttons: [{ label: 'Vazgeç' }, {
                label: 'Kaydet', cls: 'btn-primary', onClick: (ctx) => {
                    const uname = ctx.$('#usName').value.trim().toLowerCase();
                    const name = ctx.$('#usFull').value.trim();
                    const pass = ctx.$('#usPass').value;
                    if (!/^[a-z0-9._-]{3,40}$/.test(uname)) { UI.toast('Geçersiz kullanıcı adı', 'Küçük harf, rakam, . _ - (3–40).', 'warn'); return false; }
                    if (!name) { UI.toast('Ad soyad gerekli', '', 'warn'); return false; }
                    if (isNew && users().some((x) => x.username === uname)) { UI.toast('Kullanıcı adı kullanımda', uname, 'warn'); return false; }
                    if ((isNew || pass) && pass.length < 6) { UI.toast('Parola en az 6 karakter olmalı', '', 'warn'); return false; }
                    const role = isMe ? u.role : ctx.$('#usRole').value;
                    const active = isMe ? true : ctx.$('#usActive').value === '1';
                    // En az bir aktif kullanıcı yönetici yetkisine sahip kalmalı
                    const after = users().map((x) => (x.username === uname ? { ...x, role, active } : x)).concat(isNew ? [{ username: uname, role, active }] : []);
                    const admins = after.filter((x) => x.active !== false && (roles().find((r) => r.id === x.role) || { can: {} }).can.manageUsers);
                    if (!admins.length) { UI.toast('İşlem engellendi', 'Kullanıcı yönetimi yetkisine sahip en az bir aktif kullanıcı kalmalı.', 'warn'); return false; }
                    const rec = isNew ? { username: uname, name, role, active, passwordHash: A.hashPassword(uname, pass) } : u;
                    if (!isNew) {
                        Object.assign(u, { name, role, active });
                        if (pass) { u.passwordHash = A.hashPassword(uname, pass); delete u.demoPassword; }
                    } else S().users.push(rec);
                    MRP.store.audit(isNew ? 'Kullanıcı eklendi' : 'Kullanıcı güncellendi', `${uname} → ${roleName(role)}${active ? '' : ' (pasif)'}${pass ? ', parola değişti' : ''}`);
                    app().commit();
                    UI.toast('Kullanıcı kaydedildi', `${uname} · ${roleName(role)}`, 'success');
                }
            }]
        });
    }

    // ---------------- Firma ayarları (logo) ----------------
    function branding() {
        const br = S().branding || MRP.store.defaultBranding();
        const can = A.can('manageUsers');
        const logos = br.logos || [];
        return `<div class="grid grid-2">
            ${H.card('Firma logoları', 'Giriş ekranında ve menünün altında gösterilir', `<div class="card-body">
                ${H.banner(logos.length ? 'green' : 'amber', logos.length ? 'check' : 'alert', logos.length ? `${logos.length} resmî logo kullanılıyor` : 'Varsayılan logo çizimleri kullanılıyor',
                    logos.length ? 'Logolar yüklediğiniz dosyalardan gösteriliyor.' : 'Varsayılan çizimler orijinal logoların yaklaşık kopyasıdır. Doğru görünüm için firmanızın resmî logo dosyalarını (tercihen SVG veya şeffaf PNG) yükleyin.')}
                <div class="login-logos" style="border:0;margin:0 0 14px;padding:14px;background:var(--bg-elev-2);border-radius:10px;" data-brand-logos></div>
                ${logos.length ? `<div class="table-wrap" style="margin-bottom:12px;"><table><thead><tr><th>Önizleme</th><th>Dosya</th><th class="num">Boyut</th><th></th></tr></thead><tbody>
                    ${logos.map((l, i) => `<tr><td><span class="brand-logo" style="width:96px;height:34px;"><img src="${esc(l.src)}" alt=""></span></td><td>${esc(l.name)}</td><td class="num">${U.num(l.size / 1024, 1)} KB</td>
                        <td>${can ? `<div class="row-actions">${i > 0 ? `<button class="btn btn-ghost btn-sm" data-act="logoUp" data-id="${i}" title="Öne al">↑</button>` : ''}<button class="btn btn-ghost btn-sm" data-act="logoDel" data-id="${i}" title="Kaldır">${MRP.icon('trash', 'sm')}</button></div>` : ''}</td></tr>`).join('')}
                    </tbody></table></div>` : ''}
                ${can ? `<label class="btn btn-primary" style="cursor:pointer;">${MRP.icon('upload')} Logo yükle (PNG / SVG / JPG)<input type="file" accept="${LOGO_TYPES.join(',')}" hidden multiple data-change="logoAdd"></label>
                    ${logos.length ? `<button class="btn btn-ghost" data-act="logoReset" style="margin-left:6px;">Varsayılana dön</button>` : ''}
                    <p class="muted" style="font-size:.78em;margin-top:10px;">En fazla 3 logo, her biri ${MAX_LOGO_BYTES / 1024} KB'a kadar. Logolar beyaz zemin üzerinde, oranları korunarak sığdırılır.</p>` : ''}
            </div>`)}
            ${H.card('Firma bilgisi', '', `<div class="card-body"><div class="field"><label>Firma / sistem adı</label><input id="brCompany" value="${esc(br.company || '')}" placeholder="Örn: EXIT · bg group Üretim" ${can ? '' : 'readonly'}>
                <span class="hint">Menüde "MRP Pro" altında ve giriş ekranında görünür. Boş bırakılırsa varsayılan açıklama gösterilir.</span></div>
                ${can ? '<button class="btn btn-primary" data-act="brandSave" style="margin-top:12px;">Kaydet</button>' : ''}</div>`)}
        </div>`;
    }

    function readFile(f) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = () => reject(new Error('Dosya okunamadı'));
            r.readAsDataURL(f);
        });
    }

    Object.assign(MRP.actions, {
        usrTab: (t) => { uState.tab = t; app().render(); },
        roleEdit: (id) => roleEdit(id),
        roleDelete: (id) => roleDelete(id),
        userEdit: (u) => userEdit(u),
        logoAdd: async (_, el) => {
            if (!H.guard('manageUsers')) return;
            const br = S().branding = S().branding || MRP.store.defaultBranding();
            br.logos = br.logos || [];
            for (const f of [...(el.files || [])]) {
                if (br.logos.length >= 3) { UI.toast('En fazla 3 logo', '', 'warn'); break; }
                if (!LOGO_TYPES.includes(f.type)) { UI.toast('Desteklenmeyen dosya', `${f.name}: PNG, SVG, JPG, WEBP veya GIF yükleyin.`, 'warn'); continue; }
                if (f.size > MAX_LOGO_BYTES) { UI.toast('Dosya çok büyük', `${f.name}: en fazla ${MAX_LOGO_BYTES / 1024} KB`, 'warn'); continue; }
                br.logos.push({ name: f.name, size: f.size, src: await readFile(f) });
            }
            MRP.store.audit('Firma logosu güncellendi', br.logos.map((l) => l.name).join(', '));
            app().commit();
        },
        logoDel: (i) => { if (!H.guard('manageUsers')) return; S().branding.logos.splice(+i, 1); MRP.store.audit('Firma logosu kaldırıldı', ''); app().commit(); },
        logoUp: (i) => { if (!H.guard('manageUsers')) return; const l = S().branding.logos; const [x] = l.splice(+i, 1); l.splice(+i - 1, 0, x); app().commit(); },
        logoReset: async () => {
            if (!H.guard('manageUsers')) return;
            if (!(await UI.confirm('Yüklenen logolar kaldırılacak ve varsayılan çizimler gösterilecek.', { title: 'Varsayılana dön', okLabel: 'Kaldır' }))) return;
            S().branding.logos = [];
            MRP.store.audit('Firma logoları varsayılana döndü', '');
            app().commit();
        },
        brandSave: () => {
            if (!H.guard('manageUsers')) return;
            S().branding = S().branding || MRP.store.defaultBranding();
            S().branding.company = document.getElementById('brCompany').value.trim().slice(0, 80);
            MRP.store.audit('Firma adı güncellendi', S().branding.company);
            app().commit();
            UI.toast('Firma bilgisi kaydedildi', '', 'success');
        }
    });
})(window.MRP);
