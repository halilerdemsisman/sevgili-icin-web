
(function(){
  const ik={k:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',s:'<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',g:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>'};
  const sar=(id,i,goz)=>{const el=document.getElementById(id);if(!el||el.parentNode.classList.contains('g-gir'))return;const w=document.createElement('div');w.className='g-gir';el.parentNode.insertBefore(w,el);w.innerHTML=i;w.appendChild(el);
    if(goz){const b=document.createElement('button');b.type='button';b.className='g-goz';b.title='Şifreyi göster';b.innerHTML=ik.g;b.onclick=()=>{el.type=el.type==='password'?'text':'password';};w.appendChild(b);}};
  sar('gKul',ik.k);sar('gSif',ik.s,1);
  const g=document.getElementById('giris'),sol=g&&g.querySelector('.g-sol');
  if(sol&&!sol.querySelector('.g-desen'))sol.insertAdjacentHTML('afterbegin','<div class="g-desen"></div><div class="g-cizgi"><i></i><i></i><i></i></div>');
})();
