;(function(){
  const moduleRules = {
    dashboard: ["manager","operator"],
    reservations: ["manager","operator"],
    calendar: ["manager","operator"],
    reservationFilters: ["manager","operator"],
    reservationDocuments: ["manager","operator"],
    checkin: ["manager","operator"],
    stayWorkflow: ["manager","operator"],
    guests: ["manager","operator"],
    clients: ["manager","operator"],
    spaces: ["manager","operator"],
    finance: ["manager"],
    managerialReport: ["manager"],
    maintenance: ["manager","operator"],
    cleaning: ["manager","operator"],
    laundry: ["manager","operator"],
    inventory: ["manager","operator"],
    utilities: ["manager","operator"],
    employees: ["manager"],
    reports: ["manager"],
    backup: ["manager"],
    technical: ["manager","operator"]
  };

  function normalizeRole(role){
    return role === "manager" ? "manager" : "operator";
  }

  function canAccess(moduleId, role){
    return (moduleRules[moduleId] || ["manager"]).includes(normalizeRole(role));
  }

  window.EstanciaPermissions = {
    roles: ["manager","operator"],
    moduleRules,
    canAccess,
    isManager: role => normalizeRole(role) === "manager"
  };
})();
