import React, { useEffect, useState, useRef } from 'react';
import { Card, Button, Modal, Form, Row, Col, ListGroup, Alert } from 'react-bootstrap';
import axios from '../../api/axiosConfig';

import ToastMessage from '../ToastMessage';
import LoadingSpinner from '../LoadingSpinner';
import ConfirmModal from '../ConfirmModal';

/**
 * SettingsPanel
 *
 * - shows basic settings
 * - provides a simple CRUD UI for genres, moods, terms & conditions and privacy policies
 *
 * Reuses global UI components: ToastMessage, LoadingSpinner, ConfirmModal
 */
export default function SettingsPanel({ settings = {}, onEdit }) {
  /* taxonomy state */
  const [genres, setGenres] = useState([]);
  const [moods, setMoods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /* modals & forms */
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [genreForm, setGenreForm] = useState({ id: null, name: '' });
  const [genreSaving, setGenreSaving] = useState(false);

  const [showMoodModal, setShowMoodModal] = useState(false);
  const [moodForm, setMoodForm] = useState({ id: null, name: '' });
  const [moodSaving, setMoodSaving] = useState(false);

  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsList, setTermsList] = useState([]);
  const [termsForm, setTermsForm] = useState({ id: null, title: '', body: '', is_active: 0 });
  const [termsSaving, setTermsSaving] = useState(false);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [privacyList, setPrivacyList] = useState([]);
  const [privacyForm, setPrivacyForm] = useState({ id: null, title: '', body: '', is_active: 0 });
  const [privacySaving, setPrivacySaving] = useState(false);

  /* confirm modal state (reusable) */
  const [confirmState, setConfirmState] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    variant: 'danger'
  });

  /* toast state (renamed to avoid clashes) */
  const [panelToast, setPanelToast] = useState({ show: false, message: '', variant: 'success', delay: 3500, title: '' });
  const toastTimerRef = useRef(null);

  useEffect(() => {
    loadAll();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, variant = 'success', delay = 3500, title = '') => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setPanelToast({ show: true, message, variant, delay, title });
    toastTimerRef.current = setTimeout(() => setPanelToast(t => ({ ...t, show: false })), delay + 200);
  };

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [g, m, t, p] = await Promise.all([
        axios.get('/admin/genres'),
        axios.get('/admin/moods'),
        axios.get('/admin/terms'),
        axios.get('/admin/privacy')
      ]);
      setGenres(g?.data?.genres || []);
      setMoods(m?.data?.moods || []);
      setTermsList(t?.data?.terms || []);
      setPrivacyList(p?.data?.privacy || p?.data?.privacy || []); // admin/list returns {privacy: [...]}
    } catch (err) {
      console.error('Failed loading taxonomy', err);
      const msg = err?.response?.data?.error || err.message || 'Failed loading taxonomy';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Load error');
    } finally {
      setLoading(false);
    }
  }

  /* ---------- Genres ---------- */
  function openAddGenre() {
    setGenreForm({ id: null, name: '' });
    setShowGenreModal(true);
  }
  function openEditGenre(g) {
    setGenreForm({ id: g.id, name: g.name });
    setShowGenreModal(true);
  }
  async function submitGenre(e) {
    e?.preventDefault();
    if (!genreForm.name?.trim()) {
      setError('Genre name required');
      return;
    }
    setGenreSaving(true);
    setError(null);
    try {
      if (genreForm.id) {
        const res = await axios.put(`/admin/genres/${genreForm.id}`, { name: genreForm.name.trim() });
        setGenres(prev => prev.map(x => (x.id === res.data.genre.id ? res.data.genre : x)));
        showToast('Genre updated', 'success');
      } else {
        const res = await axios.post('/admin/genres', { name: genreForm.name.trim() });
        setGenres(prev => [res.data.genre, ...prev]);
        showToast('Genre created', 'success');
      }
      setShowGenreModal(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed saving genre';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Genre error');
    } finally {
      setGenreSaving(false);
    }
  }
  function promptDeleteGenre(id, name) {
    setConfirmState({
      show: true,
      title: 'Delete genre',
      message: `Delete genre "${name}"? This cannot be undone.`,
      onConfirm: () => deleteGenre(id),
      confirmText: 'Delete',
      variant: 'danger'
    });
  }
  async function deleteGenre(id) {
    setConfirmState(prev => ({ ...prev, show: false }));
    try {
      await axios.delete(`/admin/genres/${id}`);
      setGenres(prev => prev.filter(g => g.id !== id));
      showToast('Genre deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed deleting genre';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Genre error');
    }
  }

  /* ---------- Moods ---------- */
  function openAddMood() {
    setMoodForm({ id: null, name: '' });
    setShowMoodModal(true);
  }
  function openEditMood(m) {
    setMoodForm({ id: m.id, name: m.name });
    setShowMoodModal(true);
  }
  async function submitMood(e) {
    e?.preventDefault();
    if (!moodForm.name?.trim()) {
      setError('Mood name required');
      return;
    }
    setMoodSaving(true);
    setError(null);
    try {
      if (moodForm.id) {
        const res = await axios.put(`/admin/moods/${moodForm.id}`, { name: moodForm.name.trim() });
        setMoods(prev => prev.map(x => (x.id === res.data.mood.id ? res.data.mood : x)));
        showToast('Mood updated', 'success');
      } else {
        const res = await axios.post('/admin/moods', { name: moodForm.name.trim() });
        setMoods(prev => [res.data.mood, ...prev]);
        showToast('Mood created', 'success');
      }
      setShowMoodModal(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed saving mood';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Mood error');
    } finally {
      setMoodSaving(false);
    }
  }
  function promptDeleteMood(id, name) {
    setConfirmState({
      show: true,
      title: 'Delete mood',
      message: `Delete mood "${name}"? This cannot be undone.`,
      onConfirm: () => deleteMood(id),
      confirmText: 'Delete',
      variant: 'danger'
    });
  }
  async function deleteMood(id) {
    setConfirmState(prev => ({ ...prev, show: false }));
    try {
      await axios.delete(`/admin/moods/${id}`);
      setMoods(prev => prev.filter(m => m.id !== id));
      showToast('Mood deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed deleting mood';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Mood error');
    }
  }

  /* ---------- Terms & Conditions (admin) ---------- */
  function openAddTerms() {
    setTermsForm({ id: null, title: '', body: '', is_active: 0 });
    setShowTermsModal(true);
  }
  function openEditTerms(t) {
    setTermsForm({ id: t.id, title: t.title, body: t.body, is_active: !!t.is_active ? 1 : 0 });
    setShowTermsModal(true);
  }
  async function submitTerms(e) {
    e?.preventDefault();
    if (!termsForm.title?.trim() || !termsForm.body?.trim()) {
      setError('Title and body are required');
      return;
    }
    setTermsSaving(true);
    setError(null);
    try {
      if (termsForm.id) {
        const res = await axios.put(`/admin/terms/${termsForm.id}`, termsForm);
        setTermsList(prev => prev.map(x => (x.id === res.data.term.id ? res.data.term : x)));
        showToast('Terms updated', 'success');
      } else {
        const res = await axios.post('/admin/terms', termsForm);
        setTermsList(prev => [res.data.term, ...prev]);
        showToast('Terms created', 'success');
      }
      setShowTermsModal(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed saving terms';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Terms error');
    } finally {
      setTermsSaving(false);
    }
  }
  function promptDeleteTerms(id, title) {
    setConfirmState({
      show: true,
      title: 'Delete Terms & Conditions',
      message: `Delete "${title}"? This cannot be undone.`,
      onConfirm: () => deleteTerms(id),
      confirmText: 'Delete',
      variant: 'danger'
    });
  }
  async function deleteTerms(id) {
    setConfirmState(prev => ({ ...prev, show: false }));
    try {
      await axios.delete(`/admin/terms/${id}`);
      setTermsList(prev => prev.filter(t => t.id !== id));
      showToast('Terms deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed deleting terms';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Terms error');
    }
  }
  async function toggleActivateTerms(term) {
    setError(null);
    try {
      const payload = { ...term, is_active: term.is_active ? 0 : 1 };
      const res = await axios.put(`/admin/terms/${term.id}`, payload);
      setTermsList(prev => prev.map(x => (x.id === res.data.term.id ? res.data.term : x)));
      const fresh = await axios.get('/admin/terms');
      setTermsList(fresh?.data?.terms || []);
      showToast('Terms activation toggled', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed toggling active state';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Terms error');
    }
  }

  /* ---------- Privacy Policies (admin) ---------- */
  function openAddPrivacy() {
    setPrivacyForm({ id: null, title: '', body: '', is_active: 0 });
    setShowPrivacyModal(true);
  }
  function openEditPrivacy(p) {
    setPrivacyForm({ id: p.id, title: p.title, body: p.body, is_active: !!p.is_active ? 1 : 0 });
    setShowPrivacyModal(true);
  }
  async function submitPrivacy(e) {
    e?.preventDefault();
    if (!privacyForm.title?.trim() || !privacyForm.body?.trim()) {
      setError('Title and body are required');
      return;
    }
    setPrivacySaving(true);
    setError(null);
    try {
      if (privacyForm.id) {
        const res = await axios.put(`/admin/privacy/${privacyForm.id}`, privacyForm);
        setPrivacyList(prev => prev.map(x => (x.id === res.data.policy.id ? res.data.policy : x)));
        showToast('Privacy policy updated', 'success');
      } else {
        const res = await axios.post('/admin/privacy', privacyForm);
        setPrivacyList(prev => [res.data.policy, ...prev]);
        showToast('Privacy policy created', 'success');
      }
      setShowPrivacyModal(false);
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed saving privacy policy';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Privacy error');
    } finally {
      setPrivacySaving(false);
    }
  }
  function promptDeletePrivacy(id, title) {
    setConfirmState({
      show: true,
      title: 'Delete Privacy Policy',
      message: `Delete "${title}"? This cannot be undone.`,
      onConfirm: () => deletePrivacy(id),
      confirmText: 'Delete',
      variant: 'danger'
    });
  }
  async function deletePrivacy(id) {
    setConfirmState(prev => ({ ...prev, show: false }));
    try {
      await axios.delete(`/admin/privacy/${id}`);
      setPrivacyList(prev => prev.filter(p => p.id !== id));
      showToast('Privacy policy deleted', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed deleting privacy policy';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Privacy error');
    }
  }
  async function toggleActivatePrivacy(policy) {
    setError(null);
    try {
      const payload = { ...policy, is_active: policy.is_active ? 0 : 1 };
      const res = await axios.put(`/admin/privacy/${policy.id}`, payload);
      setPrivacyList(prev => prev.map(x => (x.id === res.data.policy.id ? res.data.policy : x)));
      const fresh = await axios.get('/admin/privacy');
      setPrivacyList(fresh?.data?.privacy || []);
      showToast('Privacy activation toggled', 'success');
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.error || err.message || 'Failed toggling active state';
      setError(msg);
      showToast(msg, 'danger', 5000, 'Privacy error');
    }
  }

  /* ---------- Render ---------- */
  return (
    <div className="mt-3">
      {/* panel toast */}
      <ToastMessage
        show={panelToast.show}
        onClose={() => setPanelToast(prev => ({ ...prev, show: false }))}
        message={panelToast.message}
        variant={panelToast.variant}
        delay={panelToast.delay}
        title={panelToast.title}
        position="top-end"
      />

      <div>
        <Button onClick={onEdit}>Edit Settings</Button>
      </div>

      <Card className="mt-3">
        <Card.Body>
          <p><strong>Site Name:</strong> {settings.siteName}</p>
          <p><strong>Maintenance Mode:</strong> {settings.maintenanceMode ? 'Enabled' : 'Disabled'}</p>
        </Card.Body>
      </Card>

      <Row className="mt-3">
        <Col md={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Genres</strong>
              <div>
                <Button size="sm" onClick={openAddGenre} disabled={loading}>Add Genre</Button>
              </div>
            </Card.Header>
            <Card.Body>
              {loading ? <div className="text-center py-2"><LoadingSpinner size="sm" inline={false} /></div> : null}
              {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
              {genres.length === 0 ? <div className="text-muted">No genres yet.</div> : (
                <ListGroup>
                  {genres.map(g => (
                    <ListGroup.Item key={g.id} className="d-flex justify-content-between align-items-center">
                      <div>{g.name}</div>
                      <div>
                        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEditGenre(g)} disabled={genreSaving}>Edit</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => promptDeleteGenre(g.id, g.name)} disabled={genreSaving}>Delete</Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <strong>Moods</strong>
              <div>
                <Button size="sm" onClick={openAddMood} disabled={loading}>Add Mood</Button>
              </div>
            </Card.Header>
            <Card.Body>
              {moods.length === 0 ? <div className="text-muted">No moods yet.</div> : (
                <ListGroup>
                  {moods.map(m => (
                    <ListGroup.Item key={m.id} className="d-flex justify-content-between align-items-center">
                      <div>{m.name}</div>
                      <div>
                        <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEditMood(m)} disabled={moodSaving}>Edit</Button>
                        <Button size="sm" variant="outline-danger" onClick={() => promptDeleteMood(m.id, m.name)} disabled={moodSaving}>Delete</Button>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Terms */}
      <Card className="mt-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Terms & Conditions</strong>
          <div>
            <Button size="sm" className="me-2" onClick={() => window.open('/terms', '_blank')}>View Public</Button>
            <Button size="sm" onClick={openAddTerms}>Add Terms</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {termsList.length === 0 ? <div className="text-muted">No terms & conditions created.</div> : (
            <ListGroup>
              {termsList.map(t => (
                <ListGroup.Item key={t.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{t.title}</strong>
                      <div className="text-muted small" dangerouslySetInnerHTML={{ __html: (t.body || '').slice(0, 200) + (t.body && t.body.length > 200 ? '…' : '') }} />
                    </div>
                    <div className="text-end">
                      <div className="mb-2">
                        <Form.Check type="switch" id={`active-terms-${t.id}`} label="Active"
                          checked={!!t.is_active}
                          onChange={() => toggleActivateTerms(t)} />
                      </div>
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEditTerms(t)} disabled={termsSaving}>Edit</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => promptDeleteTerms(t.id, t.title)} disabled={termsSaving}>Delete</Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Privacy */}
      <Card className="mt-3">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <strong>Privacy Policy</strong>
          <div>
            <Button size="sm" className="me-2" onClick={() => window.open('/privacy', '_blank')}>View Public</Button>
            <Button size="sm" onClick={openAddPrivacy}>Add Privacy</Button>
          </div>
        </Card.Header>
        <Card.Body>
          {privacyList.length === 0 ? <div className="text-muted">No privacy policies created.</div> : (
            <ListGroup>
              {privacyList.map(p => (
                <ListGroup.Item key={p.id}>
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>{p.title}</strong>
                      <div className="text-muted small" dangerouslySetInnerHTML={{ __html: (p.body || '').slice(0, 200) + (p.body && p.body.length > 200 ? '…' : '') }} />
                    </div>
                    <div className="text-end">
                      <div className="mb-2">
                        <Form.Check type="switch" id={`active-privacy-${p.id}`} label="Active"
                          checked={!!p.is_active}
                          onChange={() => toggleActivatePrivacy(p)} />
                      </div>
                      <Button size="sm" variant="outline-secondary" className="me-2" onClick={() => openEditPrivacy(p)} disabled={privacySaving}>Edit</Button>
                      <Button size="sm" variant="outline-danger" onClick={() => promptDeletePrivacy(p.id, p.title)} disabled={privacySaving}>Delete</Button>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Card.Body>
      </Card>

      {/* Genre Modal */}
      <Modal show={showGenreModal} onHide={() => setShowGenreModal(false)} centered>
        <Form onSubmit={submitGenre}>
          <Modal.Header closeButton><Modal.Title>{genreForm.id ? 'Edit' : 'Add'} Genre</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control value={genreForm.name} onChange={e => setGenreForm({ ...genreForm, name: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGenreModal(false)} disabled={genreSaving}>Cancel</Button>
            <Button type="submit" disabled={genreSaving}>
              {genreSaving ? <span className="me-2"><LoadingSpinner size="sm" inline /></span> : null}
              {genreForm.id ? 'Save' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Mood Modal */}
      <Modal show={showMoodModal} onHide={() => setShowMoodModal(false)} centered>
        <Form onSubmit={submitMood}>
          <Modal.Header closeButton><Modal.Title>{moodForm.id ? 'Edit' : 'Add'} Mood</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group>
              <Form.Label>Name</Form.Label>
              <Form.Control value={moodForm.name} onChange={e => setMoodForm({ ...moodForm, name: e.target.value })} />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowMoodModal(false)} disabled={moodSaving}>Cancel</Button>
            <Button type="submit" disabled={moodSaving}>
              {moodSaving ? <span className="me-2"><LoadingSpinner size="sm" inline /></span> : null}
              {moodForm.id ? 'Save' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Terms Modal */}
      <Modal size="lg" show={showTermsModal} onHide={() => setShowTermsModal(false)} centered>
        <Form onSubmit={submitTerms}>
          <Modal.Header closeButton><Modal.Title>{termsForm.id ? 'Edit' : 'Add'} Terms & Conditions</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={termsForm.title} onChange={e => setTermsForm({ ...termsForm, title: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Body (HTML allowed)</Form.Label>
              <Form.Control as="textarea" rows={10} value={termsForm.body} onChange={e => setTermsForm({ ...termsForm, body: e.target.value })} />
              <Form.Text className="text-muted">You can paste HTML or plain text. The public page will render HTML.</Form.Text>
            </Form.Group>
            <Form.Check type="checkbox" label="Active (visible publicly)" checked={!!termsForm.is_active} onChange={e => setTermsForm({ ...termsForm, is_active: e.target.checked ? 1 : 0 })} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTermsModal(false)} disabled={termsSaving}>Cancel</Button>
            <Button type="submit" disabled={termsSaving}>
              {termsSaving ? <span className="me-2"><LoadingSpinner size="sm" inline /></span> : null}
              {termsForm.id ? 'Save' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Privacy Modal */}
      <Modal size="lg" show={showPrivacyModal} onHide={() => setShowPrivacyModal(false)} centered>
        <Form onSubmit={submitPrivacy}>
          <Modal.Header closeButton><Modal.Title>{privacyForm.id ? 'Edit' : 'Add'} Privacy Policy</Modal.Title></Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Title</Form.Label>
              <Form.Control value={privacyForm.title} onChange={e => setPrivacyForm({ ...privacyForm, title: e.target.value })} />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Body (HTML allowed)</Form.Label>
              <Form.Control as="textarea" rows={10} value={privacyForm.body} onChange={e => setPrivacyForm({ ...privacyForm, body: e.target.value })} />
              <Form.Text className="text-muted">You can paste HTML or plain text. The public page will render HTML.</Form.Text>
            </Form.Group>
            <Form.Check type="checkbox" label="Active (visible publicly)" checked={!!privacyForm.is_active} onChange={e => setPrivacyForm({ ...privacyForm, is_active: e.target.checked ? 1 : 0 })} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPrivacyModal(false)} disabled={privacySaving}>Cancel</Button>
            <Button type="submit" disabled={privacySaving}>
              {privacySaving ? <span className="me-2"><LoadingSpinner size="sm" inline /></span> : null}
              {privacyForm.id ? 'Save' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Generic Confirm Modal (reused) */}
      <ConfirmModal
        show={confirmState.show}
        onHide={() => setConfirmState(prev => ({ ...prev, show: false }))}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        variant={confirmState.variant}
        onConfirm={() => {
          try {
            confirmState.onConfirm && confirmState.onConfirm();
          } catch (err) {
            console.error('confirm action failed', err);
            showToast('Action failed', 'danger');
          } finally {
            setConfirmState(prev => ({ ...prev, show: false }));
          }
        }}
      />
    </div>
  );
} 