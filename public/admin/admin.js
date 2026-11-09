const loginPanel = document.getElementById("login-panel");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const tokenInput = document.getElementById("admin-token");
const loginStatus = document.getElementById("login-status");
const dashboardStatus = document.getElementById("dashboard-status");
const leadList = document.getElementById("lead-list");
const leadCount = document.getElementById("lead-count");
const loginButton = document.getElementById("login-button");
let adminToken = "";

const statuses = ["new", "contacted", "qualified", "closed", "spam"];
const serviceNames = {
  starter: "Starter Site — $500",
  growth: "Growth Site — $850",
  rescue: "Site Rescue & Redesign — $600",
  unsure: "Not sure yet",
};

function setStatus(element, message, kind = "") {
  element.textContent = message;
  element.className = `status${kind ? ` ${kind}` : ""}`;
}

async function apiRequest(path, options = {}, token = adminToken) {
  const response = await fetch(path, {
    ...options,
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
      authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function makeMetaLink(label, value, href) {
  const item = document.createElement("span");
  item.append(`${label}: `);
  const link = document.createElement("a");
  link.textContent = value;
  link.href = href;
  item.append(link);
  return item;
}

function buildLeadCard(lead) {
  const card = document.createElement("article");
  card.className = "lead-card";

  const top = document.createElement("div");
  top.className = "lead-top";
  const identity = document.createElement("div");
  const name = document.createElement("h3");
  name.textContent = lead.name;
  const business = document.createElement("div");
  business.className = "lead-business";
  business.textContent = lead.business_name;
  identity.append(name, business);

  const date = document.createElement("time");
  date.className = "lead-date";
  date.dateTime = lead.created_at;
  const parsedDate = new Date(lead.created_at);
  date.textContent = Number.isNaN(parsedDate.valueOf()) ? lead.created_at : parsedDate.toLocaleString();
  top.append(identity, date);

  const meta = document.createElement("div");
  meta.className = "lead-meta";
  meta.append(
    makeMetaLink("Email", lead.email, `mailto:${lead.email}`),
    makeMetaLink("Phone", lead.phone, `tel:${lead.phone.replace(/[^\d+]/g, "")}`),
  );
  const service = document.createElement("span");
  service.textContent = `Interested in: ${serviceNames[lead.service] || lead.service}`;
  meta.append(service);

  const message = document.createElement("p");
  message.className = "lead-message";
  message.textContent = lead.message || "No additional details provided.";

  const actions = document.createElement("div");
  actions.className = "lead-actions";
  const statusLabel = document.createElement("label");
  statusLabel.textContent = "Follow-up status";
  const select = document.createElement("select");
  select.setAttribute("aria-label", `Follow-up status for ${lead.name}`);
  statuses.forEach((status) => {
    const option = document.createElement("option");
    option.value = status;
    option.textContent = status[0].toUpperCase() + status.slice(1);
    option.selected = status === lead.status;
    select.append(option);
  });
  statusLabel.append(select);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "button delete-button";
  deleteButton.textContent = "Delete inquiry";
  deleteButton.addEventListener("click", () => deleteLead(lead));

  select.addEventListener("change", async () => {
    const previousStatus = lead.status;
    select.disabled = true;
    try {
      await apiRequest(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
      lead.status = select.value;
      setStatus(dashboardStatus, `Updated ${lead.name}'s status.`, "success");
    } catch (error) {
      select.value = previousStatus;
      setStatus(dashboardStatus, error.message, "error");
    } finally {
      select.disabled = false;
    }
  });

  actions.append(statusLabel, deleteButton);
  card.append(top, meta, message, actions);
  return card;
}

function renderLeads(leads) {
  leadList.replaceChildren();
  leadCount.textContent = `${leads.length} ${leads.length === 1 ? "inquiry" : "inquiries"} shown (up to 200 most recent)`;

  if (!leads.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No quote requests yet. New requests from the website will appear here.";
    leadList.append(empty);
    return;
  }

  const cards = leads.map(buildLeadCard);
  leadList.append(...cards);
}

async function loadLeads() {
  setStatus(dashboardStatus, "Loading inquiries…");
  try {
    const data = await apiRequest("/api/admin/leads?limit=200");
    renderLeads(data.leads || []);
    setStatus(dashboardStatus, "Inquiries are up to date.", "success");
  } catch (error) {
    setStatus(dashboardStatus, error.message, "error");
  }
}

async function deleteLead(lead) {
  if (!window.confirm(`Permanently delete the inquiry from ${lead.name}?`)) return;
  try {
    await apiRequest(`/api/admin/leads/${lead.id}`, { method: "DELETE" });
    setStatus(dashboardStatus, "Inquiry deleted.", "success");
    await loadLeads();
  } catch (error) {
    setStatus(dashboardStatus, error.message, "error");
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const candidate = tokenInput.value.trim();
  if (candidate.length < 32) {
    setStatus(loginStatus, "Use the administrator token set for this site (at least 32 characters).", "error");
    return;
  }

  loginButton.disabled = true;
  setStatus(loginStatus, "Checking access…");
  try {
    const data = await apiRequest("/api/admin/leads?limit=200", {}, candidate);
    adminToken = candidate;
    tokenInput.value = "";
    loginPanel.hidden = true;
    dashboard.hidden = false;
    renderLeads(data.leads || []);
    setStatus(dashboardStatus, "Signed in. The token stays in memory only until you close or sign out of this page.", "success");
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
    tokenInput.select();
  } finally {
    loginButton.disabled = false;
  }
});

document.getElementById("refresh-button").addEventListener("click", loadLeads);
document.getElementById("logout-button").addEventListener("click", () => {
  adminToken = "";
  leadList.replaceChildren();
  dashboard.hidden = true;
  loginPanel.hidden = false;
  setStatus(loginStatus, "Signed out.");
  tokenInput.focus();
});
