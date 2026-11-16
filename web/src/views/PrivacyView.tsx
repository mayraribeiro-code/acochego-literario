import { ShieldCheck } from "lucide-react";

// Política de privacidade do Aconchego Literário. O texto descreve o que este
// sistema realmente faz com os dados; se o sistema mudar (ex.: um meio de
// pagamento real ou uma ferramenta de análise), atualize esta página.
const ATUALIZADA_EM = "16 de novembro de 2026";
const CONTATO = "privacidade@aconchego.example";

const SECOES: { titulo: string; corpo: React.ReactNode }[] = [
  {
    titulo: "1. Quem somos",
    corpo: (
      <p>
        O Aconchego Literário é uma livraria digital de demonstração. Nesta política,
        "nós" é o responsável pelo site, que decide como os dados são tratados (o
        controlador, na Lei Geral de Proteção de Dados, LGPD). Para qualquer assunto
        sobre seus dados, escreva para <strong>{CONTATO}</strong>.
      </p>
    ),
  },
  {
    titulo: "2. Quais dados coletamos",
    corpo: (
      <ul>
        <li>
          <strong>Cadastro:</strong> nome, e-mail e senha. A senha é guardada apenas de
          forma cifrada (hash bcrypt); ninguém, nem a equipe, consegue lê-la.
        </li>
        <li>
          <strong>Compras:</strong> livro comprado, valor, data, forma de pagamento e
          situação. No cartão, guardamos só os 4 últimos dígitos; número completo,
          validade e código de segurança são usados apenas para processar o pagamento
          e não são armazenados. No Pix, guardamos o código da cobrança.
        </li>
        <li>
          <strong>Leitura:</strong> a página ou posição em que você parou e o percentual
          lido, para continuar de onde parou em qualquer aparelho.
        </li>
        <li>
          <strong>Avaliações:</strong> nota e comentário que você decidir publicar.
        </li>
        <li>
          <strong>Sessão:</strong> ao entrar, um código de acesso (token) fica guardado
          no armazenamento local do seu navegador. Não usamos cookies de rastreamento,
          ferramentas de análise nem publicidade.
        </li>
      </ul>
    ),
  },
  {
    titulo: "3. Para que usamos e com qual base legal",
    corpo: (
      <ul>
        <li>
          Criar e manter sua conta, vender os livros, liberar a leitura e o download e
          lembrar seu progresso: <em>execução de contrato</em> (art. 7º, V, da LGPD).
        </li>
        <li>
          Guardar o registro das compras pelo prazo exigido em lei:{" "}
          <em>cumprimento de obrigação legal</em> (art. 7º, II).
        </li>
        <li>
          Proteger contas e evitar fraudes (senhas cifradas, sessões que expiram, bloqueio
          de contas desativadas): <em>legítimo interesse</em> (art. 7º, IX).
        </li>
        <li>
          Publicar sua avaliação com seu nome: <em>consentimento</em> (art. 7º, I), dado
          quando você envia a avaliação e que pode ser retirado apagando-a.
        </li>
      </ul>
    ),
  },
  {
    titulo: "4. Quem vê seus dados",
    corpo: (
      <ul>
        <li>
          <strong>Outros visitantes:</strong> só o seu nome, junto das avaliações que você
          publicar. O e-mail nunca aparece.
        </li>
        <li>
          <strong>Administradores do site:</strong> nome, compras (com a forma de pagamento
          e os 4 últimos dígitos do cartão) e avaliações, para atendimento, cancelamentos e
          moderação.
        </li>
        <li>
          <strong>Pagamentos:</strong> neste projeto o pagamento é simulado e nenhuma empresa
          externa recebe seus dados. Se um meio de pagamento real for adotado, ele receberá
          apenas o necessário para cobrar, e esta política será atualizada.
        </li>
        <li>
          <strong>Fontes do site:</strong> as fontes de texto são carregadas do Google Fonts;
          por isso, o Google recebe o endereço IP do seu aparelho ao abrir o site.
        </li>
      </ul>
    ),
  },
  {
    titulo: "5. Por quanto tempo guardamos",
    corpo: (
      <p>
        Enquanto sua conta existir. Se você desativar a conta (em "Minha conta"), o acesso
        é bloqueado na hora, mas os registros de compra são mantidos pelo prazo legal. Para
        pedir a exclusão ou a anonimização dos demais dados, escreva para {CONTATO}. Suas
        avaliações podem ser apagadas por você a qualquer momento.
      </p>
    ),
  },
  {
    titulo: "6. Como protegemos",
    corpo: (
      <p>
        Senhas cifradas, sessões que expiram e são encerradas em outros aparelhos quando
        você troca a senha, e arquivos dos livros sem link público (só quem comprou
        consegue abri-los). Nenhum sistema é totalmente imune a falhas; se ocorrer um
        incidente que possa trazer risco a você, avisaremos você e a Autoridade Nacional de
        Proteção de Dados (ANPD).
      </p>
    ),
  },
  {
    titulo: "7. Seus direitos",
    corpo: (
      <>
        <p>Pela LGPD (art. 18), você pode pedir a qualquer momento:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou errados (o nome você mesmo altera em "Minha conta");</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade dos dados para outro serviço;</li>
          <li>informação sobre com quem compartilhamos seus dados;</li>
          <li>revogação do consentimento, quando ele for a base do tratamento.</li>
        </ul>
        <p>
          Escreva para {CONTATO}. Se não ficar satisfeito com a resposta, você pode
          reclamar à ANPD.
        </p>
      </>
    ),
  },
  {
    titulo: "8. Mudanças nesta política",
    corpo: (
      <p>
        Quando esta política mudar, a data abaixo do título será atualizada; mudanças
        importantes serão avisadas no site.
      </p>
    ),
  },
];

export function PrivacyView() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#315C4C] rounded-xl flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        <h1
          className="text-2xl md:text-3xl font-bold text-[#1F3D33]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          Política de Privacidade
        </h1>
      </div>
      <p className="text-sm text-[#7A7264]">Atualizada em {ATUALIZADA_EM}</p>

      <p className="mt-5 text-xs text-[#7A7264] bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
        Projeto de demonstração. Este texto descreve como este sistema trata os dados, mas
        não substitui a revisão de um profissional antes do uso com clientes reais. O
        e-mail de contato é fictício e deve ser trocado pelo do responsável.
      </p>

      <div className="mt-8 space-y-8 text-[#292824] leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_p+ul]:mt-2 [&_ul+p]:mt-3">
        {SECOES.map((s) => (
          <section key={s.titulo}>
            <h2
              className="text-lg font-bold text-[#1F3D33] mb-2"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {s.titulo}
            </h2>
            {s.corpo}
          </section>
        ))}
      </div>
    </div>
  );
}
