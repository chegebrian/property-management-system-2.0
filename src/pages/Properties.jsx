import { useState, useEffect } from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useAuth } from "../context/AuthContext";

const propertySchema = Yup.object({
  name: Yup.string()
    .min(3, "Name must be at least 3 characters")
    .required("Required"),
  address: Yup.string().required("Address is required"),
  city: Yup.string().required("City is required"),
  state: Yup.string().required("State/County is required"),
  property_type: Yup.string()
    .oneOf(["apartment", "house", "commercial", "land"], "Select a valid type")
    .required("Required"),
  num_units: Yup.number()
    .integer("Must be a whole number")
    .min(1, "At least 1 unit")
    .required("Required"),
  monthly_rent: Yup.number()
    .positive("Must be positive")
    .required("Monthly rent is required"),
  description: Yup.string(),
});

export default function Properties() {
  const { authFetch } = useAuth();
  const [properties, setProperties] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [serverError, setServerError] = useState("");

  const fetchProperties = () => {
    authFetch("/api/properties")
      .then((r) => r.json())
      .then(setProperties);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      name: editTarget?.name || "",
      address: editTarget?.address || "",
      city: editTarget?.city || "",
      state: editTarget?.state || "",
      property_type: editTarget?.property_type || "",
      num_units: editTarget?.num_units || 1,
      monthly_rent: editTarget?.monthly_rent || "",
      description: editTarget?.description || "",
    },
    validationSchema: propertySchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setServerError("");
      const method = editTarget ? "PATCH" : "POST";
      const url = editTarget
        ? `/api/properties/${editTarget.id}`
        : "/api/properties";
      try {
        const res = await authFetch(url, {
          method,
          body: JSON.stringify(values),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save property");
        fetchProperties();
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

  const handleEdit = (prop) => {
    setEditTarget(prop);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    await authFetch(`/api/properties/${id}`, { method: "DELETE" });
    fetchProperties();
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
          <h1>Properties</h1>
          <p>Manage all your properties from here.</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          Add Property
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Address</th>
              <th>City</th>
              <th>Type</th>
              <th>Units</th>
              <th>Monthly Rent (KES)</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 && (
              <tr>
                <td colSpan={7} className="empty-row">
                  No properties found. Add one to get started.
                </td>
              </tr>
            )}
            {properties.map((p) => (
              <tr key={p.id}>
                <td>
                  <strong>{p.name}</strong>
                </td>
                <td>{p.address}</td>
                <td>{p.city}</td>
                <td>
                  <span className={`badge badge-${p.property_type}`}>
                    {p.property_type}
                  </span>
                </td>
                <td>{p.num_units}</td>
                <td>{Number(p.monthly_rent).toLocaleString()}</td>
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
            <h2>{editTarget ? "Edit Property" : "Add New Property"}</h2>
            {serverError && <div className="error-banner">{serverError}</div>}
            <form onSubmit={formik.handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Property Name</label>
                  <input type="text" {...formik.getFieldProps("name")} />
                  {formik.touched.name && formik.errors.name && (
                    <span className="field-error">{formik.errors.name}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select {...formik.getFieldProps("property_type")}>
                    <option value="">Select type</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="commercial">Commercial</option>
                    <option value="land">Land</option>
                  </select>
                  {formik.touched.property_type &&
                    formik.errors.property_type && (
                      <span className="field-error">
                        {formik.errors.property_type}
                      </span>
                    )}
                </div>
              </div>
              <div className="form-group">
                <label>Address</label>
                <input type="text" {...formik.getFieldProps("address")} />
                {formik.touched.address && formik.errors.address && (
                  <span className="field-error">{formik.errors.address}</span>
                )}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input type="text" {...formik.getFieldProps("city")} />
                  {formik.touched.city && formik.errors.city && (
                    <span className="field-error">{formik.errors.city}</span>
                  )}
                </div>
                <div className="form-group">
                  <label>State / County</label>
                  <input type="text" {...formik.getFieldProps("state")} />
                  {formik.touched.state && formik.errors.state && (
                    <span className="field-error">{formik.errors.state}</span>
                  )}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Number of Units</label>
                  <input
                    type="number"
                    min="1"
                    {...formik.getFieldProps("num_units")}
                  />
                  {formik.touched.num_units && formik.errors.num_units && (
                    <span className="field-error">
                      {formik.errors.num_units}
                    </span>
                  )}
                </div>
                <div className="form-group">
                  <label>Monthly Rent (KES)</label>
                  <input
                    type="number"
                    min="0"
                    {...formik.getFieldProps("monthly_rent")}
                  />
                  {formik.touched.monthly_rent &&
                    formik.errors.monthly_rent && (
                      <span className="field-error">
                        {formik.errors.monthly_rent}
                      </span>
                    )}
                </div>
              </div>
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea rows={3} {...formik.getFieldProps("description")} />
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
                  {formik.isSubmitting ? "Saving..." : "Save Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
