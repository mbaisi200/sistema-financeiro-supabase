'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  id: string;
  icon: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchableSelect({ options, value, onChange, placeholder = 'Digite para buscar...' }: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.id === value);
  
  const filteredOptions = search 
    ? options.filter(o => o.name.toLowerCase().startsWith(search.toLowerCase()))
    : options;

  useEffect(() => {
    setHighlightedIndex(0);
  }, [search]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: Option) => {
    onChange(option.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setIsOpen(true);
    
    // Seleciona automaticamente se houver apenas uma opção que começa com o texto
    const matchingOptions = options.filter(o => o.name.toLowerCase().startsWith(newValue.toLowerCase()));
    if (matchingOptions.length === 1) {
      onChange(matchingOptions[0].id);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          className="form-input"
          placeholder={placeholder}
          value={isOpen ? search : (selectedOption ? `${selectedOption.icon} ${selectedOption.name}` : '')}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setSearch('');
          }}
          onKeyDown={handleKeyDown}
          style={{ paddingRight: '2rem' }}
        />
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) {
              inputRef.current?.focus();
              setSearch('');
            }
          }}
          style={{
            position: 'absolute',
            right: '8px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.8rem',
            padding: '4px',
            color: '#6b7280'
          }}
        >
          {isOpen ? '▲' : '▼'}
        </button>
      </div>
      
      {isOpen && filteredOptions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #d1d5db',
            borderRadius: '0.5rem',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option.id}
              onClick={() => handleSelect(option)}
              onMouseEnter={() => setHighlightedIndex(index)}
              style={{
                padding: '0.5rem 0.75rem',
                cursor: 'pointer',
                backgroundColor: index === highlightedIndex ? '#e0e7ff' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{option.icon}</span>
              <span>{option.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
