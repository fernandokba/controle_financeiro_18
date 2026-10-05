const CACHE_NAME = "controle-financeiro-v18";
const ARQUIVOS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];
// Biblioteca de leitura/escrita de Excel (.xlsx) — carregada de um CDN externo.
// Fica numa lista separada porque, se o dispositivo instalar o app sem internet,
// isso não pode travar a instalação do restante do app (offline continua funcionando
// para tudo, exceto importar/exportar Excel, que exige essa biblioteca).
const ARQUIVOS_EXTERNOS = [
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"
];

// Instala e guarda os arquivos do app no cache do aparelho
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ARQUIVOS).then(() =>
        cache.addAll(ARQUIVOS_EXTERNOS).catch(() => {})
      )
    )
  );
  self.skipWaiting();
});

// Remove caches antigos quando uma nova versão é publicada
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(
        chaves
          .filter((chave) => chave !== CACHE_NAME)
          .map((chave) => caches.delete(chave))
      )
    )
  );
  self.clients.claim();
});

// Busca na rede com um limite de tempo curto: em sinal fraco/instável (ex: "procurando sinal" no elevador),
// a rede não avisa rápido que falhou — ela fica pendurada. Esse timeout desiste e cai pro cache, evitando
// que o app fique travado na tela de carregamento.
function fetchComTimeout(request, ms){
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    fetch(request).then((resp) => { clearTimeout(timer); resolve(resp); })
                   .catch((err) => { clearTimeout(timer); reject(err); });
  });
}

self.addEventListener("fetch", (event) => {
  // Abrir o app (navegação pelo ícone da tela inicial): serve o index.html do cache direto,
  // sem depender da rede. Isso evita ficar preso quando o Android monta a URL de abertura de forma
  // ligeiramente diferente da que foi salva no cache.
  if(event.request.mode === "navigate"){
    event.respondWith(
      caches.match("./index.html").then((resp) => resp || fetchComTimeout(event.request, 2500))
    );
    return;
  }

  // Demais arquivos (ícones, manifest): cache primeiro; só tenta rede (com timeout curto) se faltar algo novo
  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;
      return fetchComTimeout(event.request, 2500).catch(() => caches.match("./index.html"));
    })
  );
});
