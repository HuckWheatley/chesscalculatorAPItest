// Chess piece data
const pieces = {
    white: ['♔', '♕', '♖', '♗', '♘', '♙'],
    black: ['♚', '♛', '♜', '♝', '♞', '♟']
};

// Mapping from Unicode pieces to FEN characters
const pieceToFEN = {
    '♔': 'K', '♕': 'Q', '♖': 'R', '♗': 'B', '♘': 'N', '♙': 'P',
    '♚': 'k', '♛': 'q', '♜': 'r', '♝': 'b', '♞': 'n', '♟': 'p'
};

// Mapping from FEN characters to Unicode pieces
const FENtoPiece = {
    'K': '♔', 'Q': '♕', 'R': '♖', 'B': '♗', 'N': '♘', 'P': '♙',
    'k': '♚', 'q': '♛', 'r': '♜', 'b': '♝', 'n': '♞', 'p': '♟'
};

// Board state
let boardState = Array(8).fill(null).map(() => Array(8).fill(null));

// Starting position in FEN notation
const startingFEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

// Create chessboard
function createChessboard() {
    const board = document.getElementById('chessboard');
    board.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            board.appendChild(square);
        }
    }
}

// Create piece palette
function createPiecePalette() {
    const whitePieces = document.getElementById('white-pieces');
    const blackPieces = document.getElementById('black-pieces');
    
    pieces.white.forEach(piece => {
        const pieceEl = createPieceElement(piece);
        whitePieces.appendChild(pieceEl);
    });
    
    pieces.black.forEach(piece => {
        const pieceEl = createPieceElement(piece);
        blackPieces.appendChild(pieceEl);
    });
}

// Create a draggable piece element
function createPieceElement(piece) {
    const pieceEl = document.createElement('div');
    pieceEl.className = 'chess-piece';
    pieceEl.textContent = piece;
    pieceEl.draggable = true;
    
    pieceEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', piece);
        e.dataTransfer.effectAllowed = 'copy';
    });
    
    return pieceEl;
}

// Make board squares droppable
function makeSquaresDroppable() {
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(square => {
        square.addEventListener('dragover', (e) => {
            e.preventDefault();
            square.classList.add('drag-over');
        });
        
        square.addEventListener('dragleave', () => {
            square.classList.remove('drag-over');
        });
        
        square.addEventListener('drop', (e) => {
            e.preventDefault();
            const piece = e.dataTransfer.getData('text/plain');
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            square.textContent = piece;
            boardState[row][col] = piece;
            square.classList.remove('drag-over');
        });
        
        // Right-click to remove piece
        square.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const row = parseInt(square.dataset.row);
            const col = parseInt(square.dataset.col);
            
            square.textContent = '';
            boardState[row][col] = null;
        });
    });
}

// Convert board state to FEN notation
function generateFEN() {
    const turn = document.getElementById('turn-select').value;
    let fen = '';
    
    // Generate piece placement (first part of FEN)
    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        
        for (let col = 0; col < 8; col++) {
            const piece = boardState[row][col];
            
            if (piece === null) {
                emptyCount++;
            } else {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                fen += pieceToFEN[piece];
            }
        }
        
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        
        if (row < 7) {
            fen += '/';
        }
    }
    
    // Add active color
    fen += ' ' + (turn === 'white' ? 'w' : 'b');
    
    // Add castling availability (simplified - would need to track if pieces moved)
    fen += ' KQkq';
    
    // Add en passant target square (none for now)
    fen += ' -';
    
    // Add halfmove clock and fullmove number
    fen += ' 0 1';
    
    return fen;
}

// Load position from FEN notation
function loadFEN(fen) {
    // Clear current board
    boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    
    // Parse only the piece placement part (before first space)
    const fenParts = fen.split(' ');
    const piecePlacement = fenParts[0];
    const ranks = piecePlacement.split('/');
    
    for (let row = 0; row < 8; row++) {
        let col = 0;
        const rank = ranks[row];
        
        for (let i = 0; i < rank.length; i++) {
            const char = rank[i];
            
            if (char >= '1' && char <= '8') {
                // Empty squares
                col += parseInt(char);
            } else {
                // Piece
                boardState[row][col] = FENtoPiece[char];
                col++;
            }
        }
    }
    
    // Update the visual board
    updateBoardDisplay();
}

// Update the visual board from boardState
function updateBoardDisplay() {
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = boardState[row][col];
        
        square.textContent = piece || '';
    });
}

// Reset board to starting position
function resetBoard() {
    loadFEN(startingFEN);
    document.getElementById('turn-select').value = 'white';
    analyzePosition();
}

// Analyze position
function analyzePosition() {
    const turn = document.getElementById('turn-select').value;
    const analysisResult = document.getElementById('analysis-result');
    const fenOutput = document.getElementById('fen-output');
    
    // Count pieces
    let whitePieces = 0;
    let blackPieces = 0;
    let pieceCount = {
        white: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 },
        black: { king: 0, queen: 0, rook: 0, bishop: 0, knight: 0, pawn: 0 }
    };
    
    boardState.forEach(row => {
        row.forEach(piece => {
            if (piece) {
                if (pieces.white.includes(piece)) {
                    whitePieces++;
                    if (piece === '♔') pieceCount.white.king++;
                    else if (piece === '♕') pieceCount.white.queen++;
                    else if (piece === '♖') pieceCount.white.rook++;
                    else if (piece === '♗') pieceCount.white.bishop++;
                    else if (piece === '♘') pieceCount.white.knight++;
                    else if (piece === '♙') pieceCount.white.pawn++;
                }
                if (pieces.black.includes(piece)) {
                    blackPieces++;
                    if (piece === '♚') pieceCount.black.king++;
                    else if (piece === '♛') pieceCount.black.queen++;
                    else if (piece === '♜') pieceCount.black.rook++;
                    else if (piece === '♝') pieceCount.black.bishop++;
                    else if (piece === '♞') pieceCount.black.knight++;
                    else if (piece === '♟') pieceCount.black.pawn++;
                }
            }
        });
    });
    
    // Generate FEN
    const fen = generateFEN();
    fenOutput.textContent = fen;
    
    if (whitePieces === 0 && blackPieces === 0) {
        analysisResult.innerHTML = '<p>The board is empty. Please place some pieces or click "Reset to Start".</p>';
        return;
    }
    
    // Basic analysis
    let analysis = `<h3>Current Position:</h3>`;
    analysis += `<p><strong>Turn:</strong> ${turn.charAt(0).toUpperCase() + turn.slice(1)}</p>`;
    analysis += `<p><strong>White pieces:</strong> ${whitePieces}</p>`;
    analysis += `<p><strong>Black pieces:</strong> ${blackPieces}</p>`;
    
    // Material count
    analysis += `<p><strong>White:</strong> K:${pieceCount.white.king} Q:${pieceCount.white.queen} R:${pieceCount.white.rook} B:${pieceCount.white.bishop} N:${pieceCount.white.knight} P:${pieceCount.white.pawn}</p>`;
    analysis += `<p><strong>Black:</strong> K:${pieceCount.black.king} Q:${pieceCount.black.queen} R:${pieceCount.black.rook} B:${pieceCount.black.bishop} N:${pieceCount.black.knight} P:${pieceCount.black.pawn}</p>`;
    
    // Material advantage calculation
    const materialValue = {
        queen: 9, rook: 5, bishop: 3, knight: 3, pawn: 1
    };
    
    let whiteValue = pieceCount.white.queen * materialValue.queen +
                     pieceCount.white.rook * materialValue.rook +
                     pieceCount.white.bishop * materialValue.bishop +
                     pieceCount.white.knight * materialValue.knight +
                     pieceCount.white.pawn * materialValue.pawn;
    
    let blackValue = pieceCount.black.queen * materialValue.queen +
                     pieceCount.black.rook * materialValue.rook +
                     pieceCount.black.bishop * materialValue.bishop +
                     pieceCount.black.knight * materialValue.knight +
                     pieceCount.black.pawn * materialValue.pawn;
    
    let diff = whiteValue - blackValue;
    
    if (diff > 0) {
        analysis += `<p><strong>Material advantage:</strong> White +${diff}</p>`;
    } else if (diff < 0) {
        analysis += `<p><strong>Material advantage:</strong> Black +${Math.abs(diff)}</p>`;
    } else {
        analysis += `<p><strong>Material:</strong> Equal</p>`;
    }
    
    analysisResult.innerHTML = analysis;
}

// Clear board
function clearBoard() {
    boardState = Array(8).fill(null).map(() => Array(8).fill(null));
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.textContent = '');
    document.getElementById('analysis-result').innerHTML = '<p>Place pieces on the board and click "Analyze Position" to see the FEN notation and position details.</p>';
    document.getElementById('fen-output').textContent = '';
}

// Copy FEN to clipboard
function copyFEN() {
    const fenText = document.getElementById('fen-output').textContent;
    
    if (!fenText) {
        alert('No FEN to copy. Please analyze the position first.');
        return;
    }
    
    navigator.clipboard.writeText(fenText).then(() => {
        const btn = document.getElementById('copy-fen-btn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        alert('Failed to copy FEN: ' + err);
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    createChessboard();
    createPiecePalette();
    makeSquaresDroppable();
    
    // Load starting position
    resetBoard();
    
    document.getElementById('analyze-btn').addEventListener('click', analyzePosition);
    document.getElementById('clear-btn').addEventListener('click', clearBoard);
    document.getElementById('reset-btn').addEventListener('click', resetBoard);
    document.getElementById('copy-fen-btn').addEventListener('click', copyFEN);
});