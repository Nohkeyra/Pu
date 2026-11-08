import { useId } from 'react';

/** One carton drawing for the landing hero and the state-driven order preview.
 * The lid shares the tray's rear hinge; the front wall occludes the food.
 * Artwork colors describe materials, independently of the surrounding UI theme.
 */
export function KraftLunchboxArtwork({ className, closed = false, servingStyle = 'meal_box' }: { className?: string; closed?: boolean; servingStyle?: 'meal_box' | 'buffet' }) {
  const isBox = servingStyle === 'meal_box';
  const id = useId().replace(/:/g, '');
  const fill = (name: string) => `url(#${id}-${name})`;
  return (
    <svg className={className} viewBox={isBox ? "65 45 470 420" : "65 165 470 240"} data-serving-style={servingStyle} aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`${id}-front`} x1="0" y1="0" x2=".2" y2="1">
          <stop stopColor="#E9BF86" /><stop offset="1" stopColor="#C38C50" />
        </linearGradient>
        <linearGradient id={`${id}-lid`} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F3D3A0" /><stop offset="1" stopColor="#D7AA70" />
        </linearGradient>
        <linearGradient id={`${id}-rice`} x1="0" y1="0" x2=".4" y2="1">
          <stop stopColor="#FFFDF1" /><stop offset="1" stopColor="#E8E0C4" />
        </linearGradient>
      </defs>
      <ellipse cx="303" cy={isBox ? 440 : 384} rx="177" ry="15" fill="#442A19" opacity=".18" />
      {/* Open lid, with a narrow folded return and a continuous rear hinge. */}
      {isBox && <g className="box-lid" opacity={closed ? 0 : 1} strokeLinejoin="round">
        <path d="M170 230 140 88 426 66 468 215Z" fill={fill('lid')} stroke="#A46E3D" strokeWidth="4" />
        <path d="M140 88 426 66 416 87 158 108Z" fill="#FFE3B5" stroke="#BD8B54" strokeWidth="2" />
        <path d="M158 108 416 87 451 202 181 218Z" fill="#D6AB76" />
        <path d="M170 230 181 218 451 202 468 215Z" fill="#BD8954" />
        <path d="M165 114 183 207M416 96 442 193" fill="none" stroke="#E9C694" strokeWidth="2" />
      </g>}
      {/* Far wall and the liner lie behind every ingredient. */}
      <path d="M110 332 170 230 468 215 500 308Z" fill={isBox ? "#AD7743" : "#A5B4B5"} stroke={isBox ? "#9A6538" : "#596B6D"} strokeWidth="4" strokeLinejoin="round" />
      <path d="M126 320 180 240 457 226 485 299Z" fill="#285B35" />
      <path d="M135 317 185 247 452 234 476 294Z" fill="#397A43" />
      <path d="M159 302 454 247M191 247 227 310M260 242 286 306M330 239 348 303M399 235 411 299" fill="none" stroke="#7DAB60" strokeWidth="2" opacity=".6" />
      <g className="food" opacity={closed && isBox ? 0 : 1}>
        {/* Cucumber slices: skin, pale flesh, seeds; both rest on the liner. */}
        <g transform="rotate(-12 192 268)">
          <ellipse cx="192" cy="268" rx="35" ry="19" fill="#225E35" />
          <ellipse cx="192" cy="265" rx="30" ry="15" fill="#C4DAA0" stroke="#84AC62" strokeWidth="2" />
          <path d="M176 263 183 263M189 259 195 259M201 264 208 264M187 270 194 271" stroke="#EEF1CF" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g transform="rotate(8 180 286)">
          <ellipse cx="180" cy="286" rx="32" ry="17" fill="#225E35" />
          <ellipse cx="180" cy="283" rx="27" ry="13" fill="#CFE1AB" stroke="#84AC62" strokeWidth="2" />
          <path d="M165 282 172 282M179 279 185 279M187 286 194 286" stroke="#F5F3D6" strokeWidth="3" strokeLinecap="round" />
        </g>
        {/* A modest chicken drumstick with a clear meat/bone silhouette. */}
        <path d="M414 268 447 286 453 279 427 253Z" fill="#ECD9AD" stroke="#BD9B69" strokeWidth="2" />
        <path d="M445 286C444 292 449 297 454 293C461 298 467 291 461 285C465 279 458 274 453 279Z" fill="#F8E8C7" />
        <path d="M385 231C393 222 405 219 417 224L423 228Q437 229 438 242Q446 251 438 260L440 269Q434 278 425 273Q412 282 399 276Q384 275 381 263Q373 254 379 245Q375 237 385 231Z" fill="#965027" />
        <path d="M387 235Q399 224 413 230L419 234Q431 234 431 246Q439 254 430 260L434 267 425 266Q414 275 401 268Q388 270 388 258Q379 252 386 245Z" fill="#C7893D" />
        <path d="M391 238 399 234M410 237 421 243M390 251 396 260M410 264 420 258" fill="none" stroke="#E9B668" strokeWidth="3" strokeLinecap="round" />
        {/* Rice is smaller than the opening and seated inside the tray. */}
        <ellipse cx="299" cy="286" rx="80" ry="29" fill="#183E29" opacity=".24" />
        <path d="M225 270C224 234 250 208 292 205C335 202 365 227 371 263C378 286 348 305 301 307C255 310 222 295 225 270Z" fill={fill('rice')} />
        <path d="M236 278C257 294 330 301 363 276" fill="none" stroke="#D8CFB2" strokeWidth="3" />
        <path d="M243 253 249 250M264 232 270 234M285 222 291 221M309 226 315 229M333 241 339 243M250 271 256 273M274 258 280 256M296 241 302 244M318 259 324 257M343 273 349 272M275 284 281 286M300 274 307 276M319 290 325 288" fill="none" stroke="#D1C6A4" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M291 222 295 177 303 181 301 222Z" fill="#28613A" />
        <path d="M299 222 322 188 327 193 307 224Z" fill="#478449" />
        <path d="M297 216 299 186M305 217 321 196" fill="none" stroke="#8CAF69" strokeWidth="1.5" />
        {/* Half a boiled egg and a small portion of sambal. */}
        <ellipse cx="203" cy="304" rx="29" ry="20" transform="rotate(-15 203 304)" fill="#D9CEAF" />
        <ellipse cx="202" cy="300" rx="28" ry="20" transform="rotate(-15 202 300)" fill="#FFF9E7" />
        <ellipse cx="205" cy="300" rx="13" ry="12" fill="#F3B72D" />
        <path d="M370 299C378 284 393 288 401 286C414 283 432 295 431 307C426 322 409 326 391 323C374 323 362 312 370 299Z" fill="#9E3020" />
        <path d="M377 298C389 289 406 293 417 300" fill="none" stroke="#D6542D" strokeWidth="5" strokeLinecap="round" />
      </g>
      {/* Near walls hide the lower food edges; folds follow the same corners. */}
      {isBox ? <>
      <path d="M500 308 468 215 445 328 472 413Z" fill="#AE7743" stroke="#966238" strokeWidth="3" strokeLinejoin="round" />
      <path d="M110 332 500 308 472 413 139 435Z" fill={fill('front')} stroke="#A16C3B" strokeWidth="4" strokeLinejoin="round" />
      <path d="M110 332 500 308 488 324 122 347Z" fill="#F5D39E" />
      <path d="M122 347 488 324M139 435 148 420 466 400M128 349 147 420" fill="none" stroke="#BA854C" strokeWidth="2" />
      <g transform="translate(309 382) rotate(-4)">
        <text textAnchor="middle" fill="#704824" fontFamily="Arial, sans-serif" fontSize="19" fontWeight="700" letterSpacing="3">WAWASAN</text>
        <text y="18" textAnchor="middle" fill="#80572F" fontFamily="Arial, sans-serif" fontSize="8" letterSpacing="2">PAK USOP · CATERING</text>
      </g>
      </> : <g strokeLinejoin="round">
        <path d="M500 308 468 215 463 258 488 353Z" fill="#8B9D9F" stroke="#596B6D" strokeWidth="3" />
        <path d="M110 332 500 308 488 353 126 377Z" fill="#C8D4D3" stroke="#596B6D" strokeWidth="4" />
        <path d="M110 332 500 308 495 319 116 343Z" fill="#F1F5EE" />
        <path d="M129 361 482 338" stroke="#8C9FA0" strokeWidth="3" />
        <path d="M110 332 91 337 95 350 122 348M500 308 518 309 515 325 495 328" fill="#A6B7B6" stroke="#596B6D" strokeWidth="3" />
      </g>}
      {/* Closed lid covers exactly the opening; CSS toggles this existing state. */}
      {isBox && <g className="closed-top" opacity={closed ? 1 : 0} strokeLinejoin="round">
        <path d="M110 332 170 230 468 215 500 308Z" fill={fill('lid')} stroke="#A16C3B" strokeWidth="4" />
        <path d="M110 332 500 308 488 324 122 347Z" fill="#EAC18A" stroke="#A16C3B" strokeWidth="2" />
        <path d="M128 326 179 242 458 228 486 302" fill="none" stroke="#F8DCAA" strokeWidth="3" />
        <path d="M278 225 296 320 329 318 311 223Z" fill="#EFE0BF" opacity=".9" />
        <g transform="translate(304 276) rotate(-4)">
          <rect x="-72" y="-20" width="144" height="40" rx="3" fill="#FFF6DF" stroke="#BB945F" />
          <text y="5" textAnchor="middle" fill="#285B35" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="700" letterSpacing="1">WAWASAN</text>
        </g>
      </g>}
    </svg>
  );
}
