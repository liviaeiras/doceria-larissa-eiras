// ============================================================
//  CONFIGURAÇÃO DA LOJA
//  1) Cole aqui a configuração do seu projeto Firebase (veja LEIA-ME.md).
//     Enquanto estiver null, o site roda em MODO DEMONSTRAÇÃO
//     (os dados ficam só no navegador de quem está testando).
// ============================================================
export const FIREBASE_CONFIG = null;

// Firebase App Check (reCAPTCHA v3): chave do site gerada no console do reCAPTCHA (veja LEIA-ME.md).
// Vazia = App Check desligado.
export const APP_CHECK_SITE_KEY = "";
/* Exemplo:
export const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "larissa-eiras.firebaseapp.com",
  projectId: "larissa-eiras",
  appId: "1:123:web:abc"
};
*/

// Configurações iniciais. Depois de publicado, a Larissa altera tudo isso no painel.
export const LOJA_PADRAO = {
  nome: "Larissa Eiras Doceria Artesanal",
  aberto: true,
  horarioTexto: "13h às 17h",
  mensagemFechado: "Estamos fechados agora. Chama a gente no WhatsApp para encomendas!",
  whatsapp: "5521975222904",
  instagram: "larieiras.doces",
  endereco: "Rua Afonso Franco, 250, Raia, Paracambi (RJ)",
  entregaAtiva: true,
  taxaEntrega: null,          // número (ex.: 5) ou null = "a combinar"
  retiradaAtiva: true,
  pedidoMinimo: 0,
  aceitaPix: true,
  pix: { chave: "", nome: "LARISSA EIRAS", cidade: "PARACAMBI" },
  aceitaCartao: true,         // cartão: a doceria envia o link do Mercado Pago pelo WhatsApp
  categorias: [
    { id: "tortas", nome: "Tortas" },
    { id: "bolo-fatia", nome: "Bolo Fatia" },
    { id: "pizza-brownie", nome: "Pizza Brownie" },
    { id: "torta-cookie", nome: "Torta Cookie" },
    { id: "sorvetes", nome: "Sacolé e Sorvete Gourmet", nota: "Feitos com ingredientes selecionados, super cremosos e cheios de sabor." },
    { id: "bolo-de-pote", nome: "Bolo de Pote" },
    { id: "copo-supreme", nome: "Copo Supreme" },
    { id: "brownie-pote", nome: "Surpresa e Escondidinho de Brownie" }
  ]
};

// Cardápio inicial (importado para o banco no primeiro acesso ao painel).
// destaque: aparece na faixa "Fatias da casa" do início (até 6).
const P = (categoria, nome, preco, foto, desc = "", disponivel = true, destaque = false) => ({ categoria, nome, preco, foto: foto ? `img/${foto}.jpg` : "", desc, disponivel, destaque });
export const PRODUTOS_INICIAIS = [
  P("tortas","Torta de Limão",18,"fatia-limao","Base crocante, creme de limão e merengue maçaricado com raspas de limão.",true,true),
  P("tortas","Torta Doce de Leite com Caramelo Salgado",18,"torta-doce-de-leite","",true,true),
  P("tortas","Torta Maracujá com Chocolate",18,"torta-maracuja","",true,true),
  P("tortas","Torta de Ninho com Geleia de Frutas Vermelhas",18,"torta-ninho-geleia","Equilíbrio perfeito entre doce e ácido em cada fatia."),
  P("tortas","Torta de ChocoOreo",18,"torta-chocooreo","Torta de chocolate com pedaços de biscoito Oreo em uma base crocante."),
  P("tortas","Torta Triplo Chocolate",18,"torta-triplo-chocolate"),
  P("tortas","Torta Ninho com Nutella",18,"torta-ninho-nutella","",false),
  P("bolo-fatia","Bolo Fatia Ninho com Nutella",22,"bolo-ninho-nutella","Massa branca recheada com creme de Ninho, Nutella e mousse de Ninho."),
  P("bolo-fatia","Bolo Fatia Pistache com Frutas Vermelhas",22,"bolo-pistache","Massa fofinha, brigadeiro de pistache, mousse de pistache e geleia de frutas vermelhas.",true,true),
  P("bolo-fatia","Bolo Fatia ChocoMousse",22,"bolo-chocomousse","Massa de chocolate, recheio de brigadeiro e mousse de chocolate 50%."),
  P("pizza-brownie","Pizza Brownie Ninho com Nutella",15,"pizza-ninho-nutella","Brownie com cobertura de Ninho e Nutella."),
  P("pizza-brownie","Pizza Brownie Ferrero",15,"pizza-ferrero","Brownie, brigadeiro 50%, amendoim e bombom Ferrero.",true,true),
  P("pizza-brownie","Pizza Brownie KitKat",15,"pizza-kitkat","Brownie, brigadeiro 50%, granulado de chocolate e KitKat."),
  P("pizza-brownie","Pizza Brownie Ninho com Morango",15,"pizza-ninho-morango","Brownie coberto com Ninho, morangos frescos e um toque de chocolate."),
  P("torta-cookie","Torta CookieTella",19,"torta-cookietella","Massa de cookie macia por dentro e crocante por fora, recheada com Nutella."),
  P("torta-cookie","Torta Cookie BuenoTella",22,"torta-buenotella","Massa de cookie com Nutella e Kinder Bueno."),
  P("torta-cookie","CookieTella Black",19,"cookietella-black","Versão com massa de cookie de chocolate.",false),
  P("sorvetes","Sorvete Ninho com Geleia de Frutas Vermelhas",13,"sorvete-ninho-geleia"),
  P("sorvetes","Sorvete Ninho com Nutella",13,"sorvete-ninho-nutella"),
  P("sorvetes","Sorvete Nutella",13,"sorvete-nutella"),
  P("sorvetes","Sorvete Kinder",13,"sorvete-kinder"),
  P("sorvetes","Sorvete Maracujá",13,"sorvete-maracuja"),
  P("sorvetes","Sorvete Trufado de Maracujá",13,"sorvete-trufado-maracuja"),
  P("sorvetes","Sorvete Ovomaltine",13,"sorvete-ovomaltine"),
  P("sorvetes","Sorvete Doce de Leite com Paçoca",13,""),
  P("bolo-de-pote","Bolo de Pote Pistache com Geleia de Frutas Vermelhas",15,"pote-pistache","",false),
  P("bolo-de-pote","Bolo de Pote Matilda",15,"pote-matilda","",false),
  P("bolo-de-pote","Bolo de Pote Prestígio",15,"pote-prestigio","",false),
  P("bolo-de-pote","Bolo de Pote Churros",15,"pote-churros","",false),
  P("copo-supreme","Copo Supreme Ninho com Nutella",15,"copo-ninho-nutella","",false),
  P("copo-supreme","Copo Supreme Laka Oreo",15,"copo-laka-oreo","",false),
  P("copo-supreme","Copo Supreme Ninho com Morango",15,"","",false),
  P("copo-supreme","Copo Supreme Ferrero Rocher",15,"","",false),
  P("brownie-pote","Surpresa de Brownie Ninho com Nutella",14,"surpresa-ninho-nutella","",false),
  P("brownie-pote","Surpresa de Brownie Kinder Bueno",14,"surpresa-kinder","",false),
  P("brownie-pote","Surpresa de Brownie Duo Suflair",14,"","",false),
  P("brownie-pote","Escondidinho de Brownie Ninho com Morango",15,"escondidinho-morango","",false),
  P("brownie-pote","Escondidinho de Brownie Ninho com Nutella",15,"","",false)
].map((p, i) => ({ ...p, ordem: i }));
