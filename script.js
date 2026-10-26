// =====================================================
// NEXORA Corp — Login de administrador + CRUD com Supabase
// =====================================================

// Configuração real do projeto Supabase do usuário.
// A chave pública anon é apropriada para uso no navegador; nunca use service_role no frontend.
const SUPABASE_URL = "https://eunkucpjpzufpruiecfx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1bmt1Y3BqcHp1ZnBydWllY2Z4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NjI1MTMsImV4cCI6MjEwODUzODUxM30.CVVc3eW760brBUqkzXRbfV13OAU13zskZkKFYlWZHuQ";
const TABELA = "cadastros";

const ADMIN_EMAIL = "gustavo@email.com";
const ADMIN_SENHA = "Gabigol2019";

const $ = (id) => document.getElementById(id);

const configurado =
  typeof window !== "undefined" &&
  window.supabase &&
  !SUPABASE_URL.includes("SEUPROJECTID") &&
  !SUPABASE_ANON_KEY.includes("SUA-CHAVE");

let db = null;
if (configurado) {
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

let registros = [];
let idParaExcluir = null;
let processandoEnvio = false;

const tbody = $("table-body");
const modal = $("modal");
const confirmBox = $("confirm");

function esc(valor) {
  const d = document.createElement("div");
  d.textContent = valor ?? "";
  return d.innerHTML;
}

const moeda = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const dataBR = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

const iniciais = (nome) =>
  String(nome || "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

function toast(msg, erro = false) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast" + (erro ? " error" : "");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.add("hidden"), 3400);
}

function setConexao(ok) {
  $("conn-dot").className = "dot " + (ok ? "on" : "off");
  $("conn-text").textContent = ok ? "banco conectado" : "offline";
}

function validarCadastro(dados) {
  if (!dados.nome || !dados.nome.trim()) return "Informe o nome completo.";
  if (!dados.email || !dados.email.trim()) return "Informe o e-mail.";
  if (!/^\S+@\S+\.\S+$/.test(dados.email.trim())) return "Informe um e-mail válido.";
  if (!dados.cargo || !dados.cargo.trim()) return "Informe o cargo.";
  if (!dados.departamento || !dados.departamento.trim()) return "Informe o departamento.";
  if (dados.salario !== "" && Number.isNaN(Number(dados.salario))) return "Informe um salário válido.";
  return "";
}

function statusBotaoSalvar(ativo) {
  const btn = document.querySelector("#form button[type='submit']");
  if (!btn) return;
  btn.disabled = !ativo;
  btn.textContent = ativo ? "Salvar" : "Salvando...";
}

$("f-telefone").addEventListener("input", (e) => {
  let v = e.target.value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) {
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, "($1) $2-$3");
  } else if (v.length > 2) {
    v = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else if (v.length) {
    v = "(" + v;
  }
  e.target.value = v;
});

function guardarSessao(logado) {
  try {
    if (logado) sessionStorage.setItem("nexora_adm", "1");
    else sessionStorage.removeItem("nexora_adm");
  } catch (_) {}
}

function sessaoAtiva() {
  try {
    return sessionStorage.getItem("nexora_adm") === "1";
  } catch (_) {
    return false;
  }
}

function mostrarApp() {
  $("login-view").classList.add("hidden");
  $("app-view").classList.remove("hidden");
  if (!db) $("config-warning").classList.remove("hidden");
  carregar();
}

function mostrarLogin() {
  $("app-view").classList.add("hidden");
  $("login-view").classList.remove("hidden");
  $("login-form").reset();
  $("login-error").classList.add("hidden");
}

$("login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const email = $("l-email").value.trim().toLowerCase();
  const senha = $("l-senha").value;

  if (email === ADMIN_EMAIL && senha === ADMIN_SENHA) {
    guardarSessao(true);
    mostrarApp();
  } else {
    const erro = $("login-error");
    erro.textContent = "E-mail ou senha incorretos.";
    erro.classList.remove("hidden");
    $("l-senha").value = "";
    $("l-senha").focus();
  }
});

$("toggle-pass").addEventListener("click", () => {
  const campo = $("l-senha");
  const mostrar = campo.type === "password";
  campo.type = mostrar ? "text" : "password";
  $("toggle-pass").textContent = mostrar ? "ocultar" : "mostrar";
});

$("btn-logout").addEventListener("click", () => {
  guardarSessao(false);
  mostrarLogin();
});

async function carregar() {
  if (!db) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Configure o projeto Supabase em script.js para consultar os cadastros.</td></tr>`;
    return;
  }

  try {
    const { data, error } = await db.from(TABELA).select("*").order("id", { ascending: true });

    if (error) {
      setConexao(false);
      tbody.innerHTML = `<tr><td colspan="7" class="empty">Erro: ${esc(error.message)}</td></tr>`;
      toast("Falha ao ler dados: " + error.message, true);
      return;
    }

    setConexao(true);
    registros = Array.isArray(data) ? data : [];
    atualizarFiltros();
    renderizar();
  } catch (error) {
    setConexao(false);
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Erro ao conectar ao Supabase: ${esc(error.message)}</td></tr>`;
    toast("Erro de conexão com o banco: " + error.message, true);
  }
}

function atualizarFiltros() {
  const deps = [...new Set(registros.map((r) => r.departamento).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const atual = $("filter-dep").value;
  $("filter-dep").innerHTML =
    `<option value="">Todos os departamentos</option>` +
    deps.map((d) => `<option value="${esc(d)}">${esc(d)}</option>`).join("");
  $("filter-dep").value = deps.includes(atual) ? atual : "";
  $("deps").innerHTML = deps.map((d) => `<option value="${esc(d)}">`).join("");
}

function renderizar() {
  const termo = $("search").value.trim().toLowerCase();
  const dep = $("filter-dep").value;

  const lista = registros.filter((r) =>
    (!dep || r.departamento === dep) &&
    (!termo || `${r.nome ?? ""} ${r.email ?? ""} ${r.cargo ?? ""}`.toLowerCase().includes(termo))
  );

  $("stat-total").textContent = registros.length;
  $("stat-deps").textContent = new Set(registros.map((r) => r.departamento).filter(Boolean)).size;
  $("stat-folha").textContent = moeda(
    registros.reduce((soma, r) => soma + Number(String(r.salario ?? 0).replace(".", "").replace(",", ".") || 0), 0)
  );

  if (!lista.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="empty">Nenhum cadastro encontrado.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista
    .map(
      (r) => `
        <tr>
          <td>
            <div class="person">
              <div class="avatar">${esc(iniciais(r.nome))}</div>
              <div><b>${esc(r.nome)}</b><small>${esc(r.email)}</small></div>
            </div>
          </td>
          <td>${esc(r.cargo || "—")}</td>
          <td><span class="tag">${esc(r.departamento || "—")}</span></td>
          <td>${esc(r.telefone || "—")}</td>
          <td>${moeda(r.salario || 0)}</td>
          <td class="muted">${dataBR(r.criado_em)}</td>
          <td>
            <div class="actions">
              <button class="icon-btn edit" data-edit="${r.id}">Editar</button>
              <button class="icon-btn del" data-del="${r.id}">Excluir</button>
            </div>
          </td>
        </tr>`
    )
    .join("");
}

function abrirModal(registro = null) {
  $("form").reset();
  $("f-id").value = registro?.id ?? "";
  $("modal-title").textContent = registro ? "Editar cadastro" : "Novo cadastro";

  if (registro) {
    $("f-nome").value = registro.nome ?? "";
    $("f-email").value = registro.email ?? "";
    $("f-telefone").value = registro.telefone ?? "";
    $("f-salario").value = registro.salario ?? 0;
    $("f-cargo").value = registro.cargo ?? "";
    $("f-departamento").value = registro.departamento ?? "";
  }

  modal.classList.remove("hidden");
  $("f-nome").focus();
}

const fecharModal = () => modal.classList.add("hidden");

$("form").addEventListener("submit", async (e) => {
  e.preventDefault();

  if (processandoEnvio) return;

  const id = $("f-id").value;
  const dados = {
    nome: $("f-nome").value.trim(),
    email: $("f-email").value.trim(),
    telefone: $("f-telefone").value.trim() || null,
    salario: $("f-salario").value === "" ? "" : String($("f-salario").value).trim(),
    cargo: $("f-cargo").value.trim(),
    departamento: $("f-departamento").value.trim(),
  };

  const erroValidacao = validarCadastro(dados);
  if (erroValidacao) {
    toast(erroValidacao, true);
    return;
  }

  if (!db) {
    toast("Supabase não vinculado. Configure as credenciais antes de salvar.", true);
    return;
  }

  processandoEnvio = true;
  statusBotaoSalvar(false);

  try {
    const operacao = id
      ? db.from(TABELA).update(dados).eq("id", id)
      : db.from(TABELA).insert([dados]).select();

    const { data, error } = await operacao;

    if (error) {
      const mensagem = error.code === "23505" || /duplicate/i.test(error.message)
        ? "Este e-mail já está cadastrado."
        : /does not exist|column .* does not exist/i.test(error.message)
          ? "A estrutura da tabela cadastros está desatualizada. Execute a migração do SQL no Supabase antes de cadastrar."
          : error.message || "Erro ao salvar o cadastro.";
      toast(mensagem, true);
      return;
    }

    toast(id ? "Cadastro atualizado com sucesso." : "Cadastro realizado com sucesso.");
    fecharModal();
    $("form").reset();
    await carregar();
  } catch (error) {
    toast("Falha ao enviar os dados: " + error.message, true);
  } finally {
    processandoEnvio = false;
    statusBotaoSalvar(true);
  }
});

function pedirExclusao(id) {
  const r = registros.find((x) => x.id === id);
  if (!r) return;
  idParaExcluir = id;
  $("confirm-text").textContent = `Deseja excluir "${r.nome}" do cadastro? Essa ação não pode ser desfeita.`;
  confirmBox.classList.remove("hidden");
}

$("btn-confirm-no").addEventListener("click", () => {
  idParaExcluir = null;
  confirmBox.classList.add("hidden");
});

$("btn-confirm-yes").addEventListener("click", async () => {
  if (idParaExcluir === null || !db) return;

  const id = idParaExcluir;
  idParaExcluir = null;
  confirmBox.classList.add("hidden");

  const { error } = await db.from(TABELA).delete().eq("id", id);

  if (error) {
    toast("Erro ao excluir: " + error.message, true);
    return;
  }

  toast("Cadastro excluído.");
  await carregar();
});

$("btn-new").addEventListener("click", () => abrirModal());
$("btn-cancel").addEventListener("click", fecharModal);
$("search").addEventListener("input", renderizar);
$("filter-dep").addEventListener("change", renderizar);
modal.addEventListener("click", (e) => {
  if (e.target === modal) fecharModal();
});
confirmBox.addEventListener("click", (e) => {
  if (e.target === confirmBox) confirmBox.classList.add("hidden");
});

tbody.addEventListener("click", (e) => {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-del]");

  if (edit) {
    const id = Number(edit.dataset.edit);
    abrirModal(registros.find((r) => r.id === id));
  }

  if (del) {
    pedirExclusao(Number(del.dataset.del));
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharModal();
    confirmBox.classList.add("hidden");
  }
});

if (sessaoAtiva()) mostrarApp();
