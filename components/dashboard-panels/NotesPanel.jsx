import React, { useState, useEffect, useRef } from 'react';
import styled, { createGlobalStyle, keyframes, css } from 'styled-components';
import { motion } from 'framer-motion';
import {
  FiPlusCircle,
  FiTrash2,
  FiEdit,
  FiMapPin,
  FiExternalLink,
  FiSearch,
  FiDownload,
  FiUpload
} from 'react-icons/fi';
import { Client } from 'xrpl';
import { useThemeContext } from '../../context/ThemeContext';

const STORAGE_KEY = 'xrp_notes_extended';

function getServerUrl(network) {
  return network === 'testnet'
    ? 'wss://s.altnet.rippletest.net:51233'
    : 'wss://s2.ripple.com';
}

function getExplorerUrl(note) {
  const isMain = note.network !== 'testnet';
  if (note.type === 'address' && note.walletAddress) {
    return isMain
      ? `https://xrpscan.com/account/${note.walletAddress}`
      : `https://test.bithomp.com/explorer/${note.walletAddress}`;
  } else if (note.type === 'transaction' && note.txid) {
    return isMain
      ? `https://xrpscan.com/tx/${note.txid}`
      : `https://test.bithomp.com/tx/${note.txid}`;
  }
  return '';
}

const ApexGlobalStyle = createGlobalStyle`
  .apexcharts-menu {
    background-color: ${({ $isDark }) => $isDark ? '#2a2a2a' : '#fff'} !important;
    color: ${({ $isDark }) => $isDark ? '#e0e0e0' : '#333'} !important;
    border: ${({ $isDark }) => $isDark ? '1px solid #444' : '1px solid #ccc'} !important;
    box-shadow: ${({ $isDark }) =>
      $isDark ? '0 3px 10px rgba(0,0,0,0.7)' : '0 3px 8px rgba(0,0,0,0.2)'} !important;
  }
  .apexcharts-menu-item {
    padding: 6px 12px !important;
  }
  .apexcharts-menu-item:hover {
    background-color: ${({ $isDark }) => $isDark ? '#444' : '#eee'} !important;
    color: ${({ $isDark }) => $isDark ? '#fff' : '#000'} !important;
  }
`;

const gradientAnim = keyframes`
  0% { background-position:0% 50%; }
  50% { background-position:100% 50%; }
  100% { background-position:0% 50%; }
`;

export default function NotesPanel() {
  const { theme } = useThemeContext();
  const isDark = theme.darkMode;
  const [notes, setNotes] = useState([]);
  const [noteType, setNoteType] = useState('address');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [destinationTag, setDestinationTag] = useState('');
  const [txid, setTxid] = useState('');
  const [memos, setMemos] = useState('');
  const [amount, setAmount] = useState('');
  const [network, setNetwork] = useState('mainnet');
  const [color, setColor] = useState('#ffffff');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('dateDesc');
  const [editId, setEditId] = useState(null);
  const [editNoteData, setEditNoteData] = useState({});
  const fileInputRef = useRef(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setNotes(parsed);
        }
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch (err) {
      console.error('Error saving notes:', err);
    }
  }, [notes]);

  function handleAddNote() {
    if (
      !title.trim() &&
      !content.trim() &&
      !walletAddress.trim() &&
      !txid.trim()
    ) {
      return;
    }
    const now = new Date().toISOString();
    const newNote = {
      id: Date.now(),
      type: noteType,
      title: title.trim() || '(no title)',
      content: content.trim(),
      walletAddress: walletAddress.trim(),
      destinationTag: destinationTag.trim(),
      txid: txid.trim(),
      memos: memos.trim(),
      amount: amount.trim(),
      network,
      color,
      pinned: false,
      createdAt: now,
      updatedAt: now,
      metadata: {}
    };
    setNotes([newNote, ...notes]);
    setNoteType('address');
    setTitle('');
    setContent('');
    setWalletAddress('');
    setDestinationTag('');
    setTxid('');
    setMemos('');
    setAmount('');
    setNetwork('mainnet');
    setColor('#ffffff');
  }

  function handleDeleteNote(id) {
    if (!window.confirm('Delete this note?')) return;
    setNotes(notes.filter(n => n.id !== id));
  }

  function togglePin(id) {
    const upd = notes.map(n => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    setNotes(upd);
  }

  function startEdit(note) {
    setEditId(note.id);
    setEditNoteData({ ...note });
  }
  function cancelEdit() {
    setEditId(null);
    setEditNoteData({});
  }
  function saveEdit(id) {
    const now = new Date().toISOString();
    const data = { ...editNoteData };
    const upd = notes.map(n => {
      if (n.id === id) {
        return {
          ...n,
          type: data.type,
          title: (data.title || '').trim() || '(no title)',
          content: (data.content || '').trim(),
          walletAddress: (data.walletAddress || '').trim(),
          destinationTag: (data.destinationTag || '').trim(),
          txid: (data.txid || '').trim(),
          memos: (data.memos || '').trim(),
          amount: (data.amount || '').trim(),
          network: data.network,
          color: data.color || '#ffffff',
          updatedAt: now,
          metadata: data.metadata || {}
        };
      }
      return n;
    });
    setNotes(upd);
    cancelEdit();
  }

  function sortFunction(a, b) {
    if (sortField === 'dateDesc') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortField === 'dateAsc') {
      return new Date(a.createdAt) - new Date(b.createdAt);
    } else if (sortField === 'titleAsc') {
      return a.title.localeCompare(b.title);
    } else if (sortField === 'titleDesc') {
      return b.title.localeCompare(a.title);
    }
    return 0;
  }

  function getDisplayedNotes() {
    const filtered = notes.filter(n => {
      const bigStr = (
        n.title + ' ' +
        n.content + ' ' +
        (n.walletAddress || '') + ' ' +
        (n.destinationTag || '') + ' ' +
        (n.txid || '') + ' ' +
        (n.memos || '')
      ).toLowerCase();
      return bigStr.includes(search.toLowerCase());
    });
    const pinned = filtered.filter(n => n.pinned);
    const unpinned = filtered.filter(n => !n.pinned);
    pinned.sort(sortFunction);
    unpinned.sort(sortFunction);
    return [...pinned, ...unpinned];
  }

  const displayedNotes = getDisplayedNotes();

  function openInExplorer(note) {
    const url = getExplorerUrl(note);
    if (!url) {
      alert('No valid address/txid for explorer.');
      return;
    }
    window.open(url, '_blank');
  }

  async function checkBalance(note) {
    if (!note.walletAddress) return;
    const serverUrl = getServerUrl(note.network);
    const client = new Client(serverUrl);
    try {
      await client.connect();
      const resp = await client.request({
        command: 'account_info',
        account: note.walletAddress,
        ledger_index: 'validated'
      });
      const dropsStr = resp.result?.account_data?.Balance;
      const drops = parseInt(dropsStr, 10) || 0;
      const xrpBal = drops / 1000000;
      const upd = notes.map(n => {
        if (n.id === note.id) {
          return { ...n, metadata: { ...n.metadata, balance: xrpBal } };
        }
        return n;
      });
      setNotes(upd);
    } catch (err) {
      alert('CheckBalance error: ' + err.message);
    } finally {
      await client.disconnect();
    }
  }

  async function checkTx(note) {
    if (!note.txid) return;
    const serverUrl = getServerUrl(note.network);
    const client = new Client(serverUrl);
    try {
      await client.connect();
      const txResp = await client.request({
        command: 'tx',
        transaction: note.txid
      });
      const resultCode = txResp.result?.meta?.TransactionResult || 'unknown';
      const validated = !!txResp.result?.validated;
      const upd = notes.map(n => {
        if (n.id === note.id) {
          return { ...n, metadata: { ...n.metadata, txStatus: resultCode, validated } };
        }
        return n;
      });
      setNotes(upd);
    } catch (err) {
      alert('CheckTx error: ' + err.message);
    } finally {
      await client.disconnect();
    }
  }

  function handleExport() {
    try {
      const dataStr = JSON.stringify(notes, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'xrp_notes_export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  }

  function handleImportClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = ev.target.result;
        const imported = JSON.parse(text);
        if (!Array.isArray(imported)) {
          alert('Invalid file format (expected array).');
          return;
        }
        const choice = window.confirm(
          'Import notes.\nOK: merge with existing, Cancel: overwrite existing?'
        );
        if (choice) {
          setNotes([...notes, ...imported]);
        } else {
          setNotes(imported);
        }
      } catch (err) {
        alert('Error parsing file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  return (
    <>
      <ApexGlobalStyle $isDark={isDark} />
      <Container
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        $isDark={isDark}
      >
        <GlassPanel
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          $isDark={isDark}
        >
          <PanelHeader>
            <PanelTitle>XRP Notes (Advanced)</PanelTitle>
            <PanelSubtitle>
              Manage addresses, transactions, and general notes for your XRP wallet.
            </PanelSubtitle>
          </PanelHeader>

          <Section>
            <SectionTitle>
              <FiPlusCircle style={{ marginRight: 5 }} />
              Create Note
            </SectionTitle>
            <FormRow>
              <FieldGroup>
                <Label>Type</Label>
                <Select
                  $isDark={isDark}
                  value={noteType}
                  onChange={(e) => setNoteType(e.target.value)}
                >
                  <option value="address">Address</option>
                  <option value="transaction">Transaction</option>
                  <option value="general">General</option>
                </Select>
              </FieldGroup>
              <FieldGroup>
                <Label>Network</Label>
                <Select
                  $isDark={isDark}
                  value={network}
                  onChange={(e) => setNetwork(e.target.value)}
                >
                  <option value="mainnet">Mainnet</option>
                  <option value="testnet">Testnet</option>
                </Select>
              </FieldGroup>
              <RightSideBtn $isDark={isDark} onClick={handleAddNote}>
                <FiPlusCircle style={{ marginRight: 4 }} />
                Add Note
              </RightSideBtn>
            </FormRow>
            <FieldGroup>
              <Label>Title</Label>
              <Input
                $isDark={isDark}
                type="text"
                placeholder="Title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </FieldGroup>
            {noteType === 'address' && (
              <>
                <FormRow style={{ marginTop: '0.5rem' }}>
                  <FieldGroup>
                    <Label>Wallet Address</Label>
                    <Input
                      $isDark={isDark}
                      type="text"
                      placeholder="r..."
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Destination Tag</Label>
                    <Input
                      $isDark={isDark}
                      type="text"
                      placeholder="(optional)"
                      value={destinationTag}
                      onChange={(e) => setDestinationTag(e.target.value)}
                    />
                  </FieldGroup>
                </FormRow>
                <FieldGroup>
                  <Label>Memo / Comment</Label>
                  <TextArea
                    $isDark={isDark}
                    placeholder="Notes about this address..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </FieldGroup>
              </>
            )}
            {noteType === 'transaction' && (
              <>
                <FieldGroup style={{ marginTop: '0.5rem' }}>
                  <Label>Transaction ID (txid)</Label>
                  <Input
                    $isDark={isDark}
                    type="text"
                    placeholder="3E8F..."
                    value={txid}
                    onChange={(e) => setTxid(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Memos</Label>
                  <TextArea
                    $isDark={isDark}
                    placeholder="Memos (JSON or text)"
                    value={memos}
                    onChange={(e) => setMemos(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Amount (XRP)</Label>
                  <Input
                    $isDark={isDark}
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </FieldGroup>
                <FieldGroup>
                  <Label>Additional Info</Label>
                  <TextArea
                    $isDark={isDark}
                    placeholder="Any additional info about the tx..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </FieldGroup>
              </>
            )}
            {noteType === 'general' && (
              <FieldGroup style={{ marginTop: '0.5rem' }}>
                <Label>Note Content</Label>
                <TextArea
                  $isDark={isDark}
                  placeholder="Any general note..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </FieldGroup>
            )}
            <FormRow style={{ marginTop: '0.5rem' }}>
              <FieldGroup style={{ maxWidth: '120px' }}>
                <Label>Color</Label>
                <ColorInput
                  $isDark={isDark}
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                />
              </FieldGroup>
            </FormRow>
          </Section>

          <Section>
            <SectionTitle>
              <FiSearch style={{ marginRight: 5 }} />
              Search & Sort
            </SectionTitle>
            <FormRow>
              <FieldGroup>
                <Label>Search</Label>
                <Input
                  $isDark={isDark}
                  type="text"
                  placeholder="Search in title/content/address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Sort</Label>
                <Select
                  $isDark={isDark}
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                >
                  <option value="dateDesc">Newest First</option>
                  <option value="dateAsc">Oldest First</option>
                  <option value="titleAsc">Title A-Z</option>
                  <option value="titleDesc">Title Z-A</option>
                </Select>
              </FieldGroup>
            </FormRow>
          </Section>

          <Section>
            <SectionTitle>Your Notes</SectionTitle>
            {displayedNotes.length === 0 && (
              <NoDataMsg $isDark={isDark}>No notes found.</NoDataMsg>
            )}
            <NotesList>
              {displayedNotes.map((note, idx) => {
                const zebra = idx % 2 === 1;
                const isEditing = editId === note.id;
                let noteColor = note.color || '#ffffff';
                if (noteColor.toLowerCase() === '#ffffff' && isDark) {
                  noteColor = '#2f2f2f';
                }
                if (isEditing) {
                  return (
                    <NoteCard key={note.id} $zebra={zebra}>
                      <NoteHeader>
                        <NoteTitleEdit
                          $isDark={isDark}
                          value={editNoteData.title || ''}
                          onChange={(e) => setEditNoteData({ ...editNoteData, title: e.target.value })}
                          placeholder="(no title)"
                        />
                        <ButtonGroup>
                          <SmallBtn $isDark={isDark} onClick={() => saveEdit(note.id)}>
                            Save
                          </SmallBtn>
                          <SmallBtn $isDark={isDark} onClick={cancelEdit}>
                            Cancel
                          </SmallBtn>
                        </ButtonGroup>
                      </NoteHeader>
                      <NoteBody style={{ backgroundColor: editNoteData.color || '#ffffff' }}>
                        <FormRow>
                          <FieldGroup style={{ maxWidth: '140px' }}>
                            <Label>Type</Label>
                            <Select
                              $isDark={isDark}
                              value={editNoteData.type}
                              onChange={(e) => setEditNoteData({ ...editNoteData, type: e.target.value })}
                            >
                              <option value="address">Address</option>
                              <option value="transaction">Transaction</option>
                              <option value="general">General</option>
                            </Select>
                          </FieldGroup>
                          <FieldGroup style={{ maxWidth: '140px' }}>
                            <Label>Network</Label>
                            <Select
                              $isDark={isDark}
                              value={editNoteData.network}
                              onChange={(e) => setEditNoteData({ ...editNoteData, network: e.target.value })}
                            >
                              <option value="mainnet">Mainnet</option>
                              <option value="testnet">Testnet</option>
                            </Select>
                          </FieldGroup>
                        </FormRow>
                        {editNoteData.type === 'address' && (
                          <>
                            <FormRow>
                              <FieldGroup>
                                <Label>Wallet Address</Label>
                                <Input
                                  $isDark={isDark}
                                  type="text"
                                  value={editNoteData.walletAddress || ''}
                                  onChange={(e) => setEditNoteData({ ...editNoteData, walletAddress: e.target.value })}
                                />
                              </FieldGroup>
                              <FieldGroup>
                                <Label>Destination Tag</Label>
                                <Input
                                  $isDark={isDark}
                                  type="text"
                                  value={editNoteData.destinationTag || ''}
                                  onChange={(e) => setEditNoteData({ ...editNoteData, destinationTag: e.target.value })}
                                />
                              </FieldGroup>
                            </FormRow>
                            <FieldGroup>
                              <Label>Memo/Comment</Label>
                              <TextArea
                                $isDark={isDark}
                                value={editNoteData.content || ''}
                                onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
                              />
                            </FieldGroup>
                          </>
                        )}
                        {editNoteData.type === 'transaction' && (
                          <>
                            <FieldGroup>
                              <Label>TxID</Label>
                              <Input
                                $isDark={isDark}
                                type="text"
                                value={editNoteData.txid || ''}
                                onChange={(e) => setEditNoteData({ ...editNoteData, txid: e.target.value })}
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label>Memos</Label>
                              <TextArea
                                $isDark={isDark}
                                value={editNoteData.memos || ''}
                                onChange={(e) => setEditNoteData({ ...editNoteData, memos: e.target.value })}
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label>Amount (XRP)</Label>
                              <Input
                                $isDark={isDark}
                                type="text"
                                value={editNoteData.amount || ''}
                                onChange={(e) => setEditNoteData({ ...editNoteData, amount: e.target.value })}
                              />
                            </FieldGroup>
                            <FieldGroup>
                              <Label>Additional Info</Label>
                              <TextArea
                                $isDark={isDark}
                                value={editNoteData.content || ''}
                                onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
                              />
                            </FieldGroup>
                          </>
                        )}
                        {editNoteData.type === 'general' && (
                          <FieldGroup>
                            <Label>Note Content</Label>
                            <TextArea
                              $isDark={isDark}
                              value={editNoteData.content || ''}
                              onChange={(e) => setEditNoteData({ ...editNoteData, content: e.target.value })}
                            />
                          </FieldGroup>
                        )}
                        <FieldGroup style={{ marginTop: '0.5rem', maxWidth: '120px' }}>
                          <Label>Color</Label>
                          <ColorInput
                            $isDark={isDark}
                            type="color"
                            value={editNoteData.color || '#ffffff'}
                            onChange={(e) => setEditNoteData({ ...editNoteData, color: e.target.value })}
                          />
                        </FieldGroup>
                      </NoteBody>
                    </NoteCard>
                  );
                }
              })}
            </NotesList>
          </Section>
          <Section>
            <SectionTitle>Import / Export</SectionTitle>
            <EditButtonRow>
              <ImportExportBtn $isDark={isDark} onClick={handleExport}>
                <FiDownload style={{ marginRight: 5 }} />
                Export JSON
              </ImportExportBtn>
              <ImportExportBtn $isDark={isDark} onClick={handleImportClick}>
                <FiUpload style={{ marginRight: 5 }} />
                Import JSON
              </ImportExportBtn>
              <HiddenFileInput
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
              />
            </EditButtonRow>
            <SmallNote $isDark={isDark}>
              Exported file name: <em>xrp_notes_export.json</em><br />
              Import merges or overwrites existing notes.
            </SmallNote>
          </Section>
        </GlassPanel>
      </Container>
    </>
  );
}

/* Styled Components Definitions */

const Container = styled(motion.div)`
  width: 100%;
  min-height: 340px;
  padding: 0.8rem;
  border-radius: 8px;
  box-sizing: border-box;
  color: ${({ $isDark, theme }) => $isDark ? '#dfe1e2' : (theme.color || '#333')};
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.background || 'linear-gradient(135deg,rgba(26,36,47,0),rgba(20,26,32,0))')
      : (theme.background || 'linear-gradient(135deg, #fafafa, #f5f5f5)')};
  background-size: 200% 200%;
  animation: ${gradientAnim} 10s ease infinite;
  position: relative;
`;

const GlassPanel = styled(motion.div)`
  border-radius: 10px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  padding: 1rem;
  background: ${({ $isDark, theme }) =>
    $isDark
      ? (theme.panelBg || 'linear-gradient(to right, rgba(255,0,0,0), rgba(255,255,255,0.05))')
      : (theme.panelBg || 'linear-gradient(to right, rgba(255,255,255,0.7), rgba(255,255,255,0.4))')};
  box-shadow: ${({ $isDark }) =>
    $isDark ? '0 2px 8px rgba(0,0,0,0)' : '0 2px 8px rgba(0,0,0,0)'};
  border: ${({ $isDark, theme }) =>
    $isDark
      ? `1px solid ${theme.borderColor || '#ccc'}`
      : `1px solid ${theme.borderColor || '#ccc'}`};
  display: flex;
  flex-direction: column;
  min-height: 260px;
`;

const PanelHeader = styled.div`
  margin-bottom: 1rem;
`;

const PanelTitle = styled.h2`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
`;

const PanelSubtitle = styled.p`
  margin: 0;
  margin-top: 0.3rem;
  font-size: 0.9rem;
  color: inherit;
`;

const Section = styled.div`
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const FormRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 150px;
`;

const Label = styled.label`
  margin-bottom: 0.2rem;
  font-size: 0.85rem;
`;

const Input = styled.input`
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  border-radius: 4px;
  padding: 0.4rem;
  font-size: 0.85rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || 'rgba(255,255,255,0.07)') : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
`;

const TextArea = styled.textarea`
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  border-radius: 4px;
  padding: 0.4rem;
  font-size: 0.85rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || 'rgba(255,255,255,0.07)') : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  min-height: 60px;
  resize: vertical;
`;

const Select = styled.select`
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  border-radius: 4px;
  padding: 0.4rem;
  font-size: 0.85rem;
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || 'rgba(255,255,255,0.07)') : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  & option {
    background: ${({ $isDark }) => $isDark ? '#2f2f2f' : '#fff'};
    color: ${({ $isDark }) => $isDark ? '#fff' : '#333'};
  }
`;

const ColorInput = styled.input`
  width: 50px;
  height: 30px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.07)' : '#fff'};
`;

const RightSideBtn = styled.button`
  margin-left: auto;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  background: transparent;
  font-size: 0.85rem;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  display: inline-flex;
  align-items: center;
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
`;

const NoDataMsg = styled.p`
  font-style: italic;
  margin: 0.5rem 0;
  color: ${({ $isDark }) => $isDark ? '#ccc' : '#777'};
`;

const NotesList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
`;

const NoteCard = styled.div`
  border: 1px solid ${({ theme }) => theme.borderColor || '#ddd'};
  border-radius: 4px;
  padding: 0.6rem;
  ${({ $zebra }) => $zebra && css`filter: brightness(0.98);`}
`;

const NoteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
`;

const NoteTitle = styled.h4`
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
`;

const NoteTitleEdit = styled.input`
  border: 1px solid ${({ $isDark, theme }) => $isDark ? (theme.inputBorder || '#444') : (theme.inputBorder || '#ccc')};
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  font-size: 1rem;
  font-weight: 500;
  background: ${({ $isDark, theme }) => $isDark ? (theme.inputBg || 'rgba(255,255,255,0.07)') : (theme.inputBg || '#fff')};
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  flex: 1;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const SmallBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
  svg {
    color: inherit;
  }
`;

const NoteBody = styled.div`
  padding: 0.5rem;
  border-radius: 4px;
  margin-top: 0.4rem;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
`;

const NoteSubInfo = styled.p`
  margin: 0.3rem 0;
  font-size: 0.9rem;
`;

const NoteContent = styled.div`
  margin: 0.5rem 0;
`;

const NoteFooter = styled.p`
  margin: 0;
  margin-top: 0.4rem;
  font-size: 0.85rem;
`;

const ExtraRow = styled.div`
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
`;

const ActionBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
  svg {
    color: inherit;
  }
`;

const EditButtonRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-top: 0.6rem;
`;

const ImportExportBtn = styled.button`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.borderColor || '#ccc'};
  border-radius: 4px;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.85rem;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
  &:hover {
    background: ${({ $isDark }) => $isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  }
  svg {
    color: inherit;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const SmallNote = styled.p`
  font-size: 0.8rem;
  margin-top: 0.6rem;
  color: ${({ $isDark, theme }) => $isDark ? '#fff' : (theme.color || '#333')};
`;
