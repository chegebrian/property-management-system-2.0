import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../context/AuthContext";

const tenantSchema = Yup.object({
  first_name: Yup.string().min(2, "Too short").required("Required"),
  last_name: Yup.string().min(2, "Too short").required("Required"),
  email: Yup.string().email("Invalid email").required("Required"),
  phone: Yup.string()
    .matches(/^\+?[\d\s\-]{7,15}$/, "Invalid phone format")
    .required("Required"),
  national_id: Yup.string().min(5, "ID too short"),
  emergency_contact: Yup.string(),
});

export default function Tenants() {
  const { authFetch } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [serverError, setServerError] = useState("");

  const fetchTenants = () => {
    authFetch("/api/tenants")
      .then((r) => r.json())
      .then(setTenants);
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      first_name: editTarget?.first_name || "",
      last_name: editTarget?.last_name || "",
      email: editTarget?.email || "",
      phone: editTarget?.phone || "",
      national_id: editTarget?.national_id || "",
      emergency_contact: editTarget?.emergency_contact || "",
    },
    validationSchema: tenantSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError("");
      const method = editTarget ? "PATCH" : "POST";
      const url = editTarget ? `/api/tenants/${editTarget.id}` : "/api/tenants";
      try {
        const res = await authFetch(url, {
          method,
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save tenant");
        fetchTenants();
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

  const handleEdit = (t) => {
    setEditTarget(t);
    setShowModal(true);
  };
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this tenant?")) return;
    await authFetch(`/api/tenants/${id}`, { method: "DELETE" });
    fetchTenants();
  };
  const openAdd = () => {
    setEditTarget(null);
    formik.resetForm();
    setShowModal(true);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Tenants</h1>
          <p>Manage all registered tenants.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          Add Tenant
        </button>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>National ID</th>
              <th>Emergency Contact</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tenants.length === 0 && (
              <tr>
                <td colSpan={6} className="empty-row">
                  No tenants found.
                </td>
              </tr>
            )}
            {tenants.map((t) => (
              <tr key={t.id}>
                <td>
                  <strong>
                    {t.first_name} {t.last_name}
                  </strong>
                </td>
                <td>{t.email}</td>
                <td>{t.phone}</td>
                <td>{t.national_id || "—"}</td>
                <td>{t.emergency_contact || "—"}</td>
                <td>
                  <button
                    className="btn-sm btn-edit"
                    onClick={() => handleEdit(t)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-sm btn-delete"
                    onClick={() => handleDelete(t.id)}
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
            <h2>{editTarget ? "Edit Tenant" : "Add New Tenant"}</h2>
            {serverError && <div className="error-banner">{serverError}</div>}
            <form onSubmit={formik.handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input type="text" {...formik.getFieldProps("first_name")} />
                  {formik.touched.first_name && formik.errors.first_name && (
                    <span className="field-error">
                      {formik.errors.first_name}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input type="text" {...formik.getFieldProps("last_name")} />
                  {formik.touched.last_name && formik.errors.last_name && (
                    <span className="field-error">
                      {formik.errors.last_name}
                    </span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" {...formik.getFieldProps("email")} />
                  {formik.touched.email && formik.errors.email && (
                    <span className="field-error">{formik.errors.email}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    placeholder="+254700..."
                    {...formik.getFieldProps("phone")}
                  />
                  {formik.touched.phone && formik.errors.phone && (
                    <span className="field-error">{formik.errors.phone}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>National ID</label>
                  <input type="text" {...formik.getFieldProps("national_id")} />
                  {formik.touched.national_id && formik.errors.national_id && (
                    <span className="field-error">
                      {formik.errors.national_id}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input
                    type="text"
                    {...formik.getFieldProps("emergency_contact")}
                  />
                </div>
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
                  {formik.isSubmitting ? "Saving..." : "Save Tenant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
