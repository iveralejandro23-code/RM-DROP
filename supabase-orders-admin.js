
/* ==========================================================
   RIVER STORE V12.3 — PEDIDOS + INVENTARIO EN SUPABASE
   Supabase pasa a ser la fuente compartida para:
   orders, order_items, inventory_movements y order_notes.
   ========================================================== */
(() => {
  const cfg = window.RIVER_CONFIG || {};
  const db = window.riverSupabase ||
    (window.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY
      ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY)
      : null);

  if (!db) {
    console.error("RIVER V12.3: Supabase no disponible.");
    return;
  }

  window.riverSupabase = db;

  function setOrderOnlineStatus(text, type = "") {
    const el = document.getElementById("onlineOrderStatus");
    if (!el) return;
    el.textContent = text;
    el.className = `online-order-status ${type}`;
  }

  function mapDbOrder(row) {
    return {
      _dbId: row.id,
      folio: row.folio,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      status: row.status,
      customer: {
        name: row.customer_name,
        phone: row.customer_phone,
        email: row.customer_email || ""
      },
      delivery: {
        type: row.delivery_type,
        address: row.delivery_address || "",
        city: row.delivery_city || "",
        zip: row.delivery_zip || ""
      },
      payment: row.payment,
      notes: row.notes || "",
      total: Number(row.total) || 0,
      inventoryApplied: row.inventory_applied === true,
      cancellationReason: row.cancellation_reason || "",
      cancelledAt: row.cancelled_at || null,
      items: (row.order_items || []).map(item => ({
        id: Number(item.product_id),
        name: item.product_name,
        qty: Number(item.qty),
        price: Number(item.unit_price),
        subtotal: Number(item.subtotal)
      })),
      internalNotes: (row.order_notes || [])
        .map(n => ({ text: n.note, date: n.created_at }))
        .sort((a,b) => new Date(b.date) - new Date(a.date))
    };
  }

  function mapMovement(row) {
    return {
      id: row.id,
      date: row.created_at,
      type: row.movement_type,
      productId: Number(row.product_id),
      productName: row.product_name,
      qty: Number(row.qty),
      before: Number(row.stock_before),
      after: Number(row.stock_after),
      reason: row.reason,
      folio: row.folio || ""
    };
  }

  async function refreshOnlineOrders() {
    setOrderOnlineStatus("Actualizando pedidos desde Supabase…");

    const { data, error } = await db
      .from("orders")
      .select(`
        id, folio, status,
        customer_name, customer_phone, customer_email,
        delivery_type, delivery_address, delivery_city, delivery_zip,
        payment, notes, total, inventory_applied,
        cancellation_reason, cancelled_at, created_at, updated_at,
        order_items (
          id, product_id, product_name, qty, unit_price, subtotal
        ),
        order_notes (
          id, note, created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setOrderOnlineStatus("No se pudieron cargar los pedidos de Supabase.", "error");
      return false;
    }

    const orders = (data || []).map(mapDbOrder);
    localStorage.setItem("river_orders", JSON.stringify(orders));
    renderOrders();

    const { data: movements, error: movementError } = await db
      .from("inventory_movements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (!movementError) {
      localStorage.setItem(
        "river_inventory_movements",
        JSON.stringify((movements || []).map(mapMovement))
      );
      renderInventoryMovements();
    }

    setOrderOnlineStatus(`Supabase conectado · ${orders.length} pedido(s)`, "ok");
    return true;
  }

  updateOrderStatus = async function(folio, status) {
    const order = loadOrders().find(o => o.folio === folio);
    if (!order || !order._dbId) {
      alert("No se encontró el pedido en Supabase.");
      await refreshOnlineOrders();
      return;
    }

    let cancellationReason = null;
    if (status === "Cancelado" && order.status !== "Cancelado") {
      const reason = prompt(
        "Motivo de cancelación:\n\nEjemplos: Cliente desistió, falta de pago, producto agotado, pedido duplicado u otro.",
        order.cancellationReason || ""
      );
      if (reason === null) {
        renderOrders();
        return;
      }
      cancellationReason = reason.trim() || "Sin motivo especificado";
    }

    setOrderOnlineStatus(`Actualizando ${folio}…`);

    const { error } = await db.rpc("admin_set_order_status", {
      p_order_id: order._dbId,
      p_status: status,
      p_cancellation_reason: cancellationReason
    });

    if (error) {
      console.error(error);
      setOrderOnlineStatus("No se pudo actualizar el pedido.", "error");

      const message = String(error.message || "");
      if (message.toLowerCase().includes("stock insuficiente")) {
        alert("No hay suficiente inventario para confirmar este pedido.");
      } else {
        alert("No se pudo cambiar el estado del pedido.");
      }

      await refreshOnlineOrders();
      return;
    }

    // Stock e inventario cambiaron en PostgreSQL.
    if (typeof window.refreshProductsFromSupabase === "function") {
      await window.refreshProductsFromSupabase();
    }

    await refreshOnlineOrders();
  };

  addInternalOrderNote = async function(folio) {
    const order = loadOrders().find(o => o.folio === folio);
    if (!order || !order._dbId) return;

    const note = prompt("Agregar nota interna para " + folio + ":", "");
    if (note === null || !note.trim()) return;

    const { data: userData } = await db.auth.getUser();
    const userId = userData?.user?.id;

    const { error } = await db.from("order_notes").insert({
      order_id: order._dbId,
      note: note.trim(),
      created_by: userId
    });

    if (error) {
      console.error(error);
      alert("No se pudo guardar la nota interna.");
      return;
    }

    await refreshOnlineOrders();
  };

  // En V12.3 no se borran pedidos desde el navegador.
  if (typeof clearOrdersBtn !== "undefined" && clearOrdersBtn) {
    clearOrdersBtn.style.display = "none";
  }

  window.refreshOnlineOrders = refreshOnlineOrders;

  // Refresco periódico sencillo para pruebas con distintos dispositivos.
  setTimeout(refreshOnlineOrders, 450);
  setInterval(refreshOnlineOrders, 30000);
})();
