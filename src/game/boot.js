function fail(error){
  console.error(error);
  const caption=document.querySelector('#boot-caption');
  if(caption)caption.textContent='The zoo could not open. Check your connection and try again.';
  const retry=document.querySelector('#boot-retry');if(retry)retry.hidden=false;
}
document.querySelector('#boot-retry')?.addEventListener('click',()=>location.reload());
try{
  const response=await fetch('./assets/manifest.json',{cache:'no-cache'});
  if(!response.ok)throw new Error(`Asset list returned ${response.status}`);
  const manifest=await response.json();
  if(manifest.version!==1||!manifest.models||!manifest.thumbnails)throw new Error('Unsupported asset list');
  globalThis.ZOO_ASSET_MANIFEST=manifest;
  globalThis.ZOO_THUMBNAILS=manifest.thumbnails;
  document.querySelector('#boot-caption').textContent='Opening the park…';
  await import('./main.js');
}catch(error){fail(error);}
