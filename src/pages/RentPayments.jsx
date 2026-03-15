import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../context/AuthContext";

const paymentSchema = Yup.object({
  tenant_id: Yup.number().required("Tenant is required"),
  property_id: Yup.number().required("Property is required"),
  amount_paid: Yup.number()
    .positive("Amount must be positive")
    .required("Amount is required"),
  payment_date: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .required("Required"),
  due_date: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
    .required("Required"),
  status: Yup.string()
    .oneOf(["paid", "pending", "overdue", "partial"])
    .required("Required"),
  payment_method: Yup.string()
    .oneOf(["cash", "bank_transfer", "mpesa", "cheque"])
    .required("Required"),
  notes: Yup.string(),
});

const statusColors = {
  paid: "green",
  pending: "amber",
  overdue: "red",
  partial: "blue",
};

export default function RentPayments() {
  const { authFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [serverError, setServerError] = useState("");

  const fetchAll = () => {
    authFetch("/api/rent-payments")
      .then((r) => r.json())
      .then(setPayments);
    authFetch("/api/tenants")
      .then((r) => r.json())
      .then(setTenants);
    authFetch("/api/properties")
      .then((r) => r.json())
      .then(setProperties);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      tenant_id: editTarget?.tenant_id || "",
      property_id: editTarget?.property_id || "",
      amount_paid: editTarget?.amount_paid || "",
      payment_date: editTarget?.payment_date || "",
      due_date: editTarget?.due_date || "",
      status: editTarget?.status || "pending",
      payment_method: editTarget?.payment_method || "cash",
      notes: editTarget?.notes || "",
    },
    validationSchema: paymentSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError("");
      const method = editTarget ? "PATCH" : "POST";
      const url = editTarget
        ? `/api/rent-payments/${editTarget.id}`
        : "/api/rent-payments";
      try {
        const res = await authFetch(url, {
          method,
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save payment");
        fetchAll();
        resetForm();
        setShowModal(false);
        setEditTarget(null);
      } catch (err) {
        setServerError(err.message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleEdit = (p) => {
    setEditTarget(p);
    setShowModal(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this payment record?")) return;
    await authFetch(`/api/rent-payments/${id}`, { method: "DELETE" });
    fetchAll();
  };
  const openAdd = () => {
    setEditTarget(null);
    formik.resetForm();
    setShowModal(true);
  };

  const getTenantName = (id) => {
    const t = tenants.find((t) => t.id === id);
    return t ? `${t.first_name} ${t.last_name}` : id;
  };
  const getPropertyName = (id) => {
    const p = properties.find((p) => p.id === id);
    return p ? p.name : id;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Rent Payments</h1>
          <p>Track all rent payments across your properties.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          Record Payment
        </button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Property</th>
              <th>Amount (KES)</th>
              <th>Payment Date</th>
              <th>Due Date</th>
              <th>Method</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {payments.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  No payment records found.
                </td>
              </tr>
            )}
            {payments.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{getTenantName(p.tenant_id)}</strong>
                </td>
                <td>{getPropertyName(p.property_id)}</td>
                <td>{Number(p.amount_paid).toLocaleString()}</td>
                <td>{p.payment_date}</td>
                <td>{p.due_date}</td>
                <td>{p.payment_method}</td>
                <td>
                  <span className={`badge badge-${statusColors[p.status]}`}>
                    {p.status}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-sm btn-edit"
                    onClick={() => handleEdit(p)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-sm btn-delete"
                    onClick={() => handleDelete(p.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editTarget ? "Edit Payment" : "Record Payment"}</h2>
            {serverError && <div className="error-banner">{serverError}</div>}
            <form onSubmit={formik.handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Tenant</label>
                  <select {...formik.getFieldProps("tenant_id")}>
                    <option value="">Select tenant</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.first_name} {t.last_name}
                      </option>
                    ))}
                  </select>
                  {formik.touched.tenant_id && formik.errors.tenant_id && (
                    <span className="field-error">
                      {formik.errors.tenant_id}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Property</label>
                  <select {...formik.getFieldProps("property_id")}>
                    <option value="">Select property</option>
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {formik.touched.property_id && formik.errors.property_id && (
                    <span className="field-error">
                      {formik.errors.property_id}
                    </span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Amount Paid (KES)</label>
                  <input
                    type="number"
                    min="0"
                    {...formik.getFieldProps("amount_paid")}
                  />
                  {formik.touched.amount_paid && formik.errors.amount_paid && (
                    <span className="field-error">
                      {formik.errors.amount_paid}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select {...formik.getFieldProps("status")}>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                    <option value="partial">Partial</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Payment Date (YYYY-MM-DD)</label>
                  <input
                    type="date"
                    {...formik.getFieldProps("payment_date")}
                  />
                  {formik.touched.payment_date &&
                    formik.errors.payment_date && (
                      <span className="field-error">
                        {formik.errors.payment_date}
                      </span>
                    )}
                </div>
                <div className="form-group">
                  <label>Due Date (YYYY-MM-DD)</label>
                  <input type="date" {...formik.getFieldProps("due_date")} />
                  {formik.touched.due_date && formik.errors.due_date && (
                    <span className="field-error">
                      {formik.errors.due_date}
                    </span>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select {...formik.getFieldProps("payment_method")}>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea rows={2} {...formik.getFieldProps("notes")} />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowModal(false);
                    setEditTarget(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={formik.isSubmitting}
                >
                  {formik.isSubmitting ? "Saving..." : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
