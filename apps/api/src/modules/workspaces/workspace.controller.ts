import { Request, Response, NextFunction } from 'express';
import * as workspaceService from './workspace.service';

export async function createWorkspace(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspace = await workspaceService.createWorkspace(req.user!.id, req.body);
    res.status(201).json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
}

export async function getWorkspaces(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspaces = await workspaceService.getWorkspaces(req.user!.id);
    res.status(200).json({ success: true, data: workspaces });
  } catch (err) {
    next(err);
  }
}

export async function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invite = await workspaceService.inviteMember(
      req.params['workspaceId']!,
      req.user!.id,
      req.body,
    );
    res.status(201).json({ success: true, data: invite });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const workspace = await workspaceService.acceptInvite(req.params['token']!, req.user!.id);
    res.status(200).json({ success: true, data: workspace });
  } catch (err) {
    next(err);
  }
}

export async function getMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const members = await workspaceService.getMembers(req.params['workspaceId']!);
    res.status(200).json({ success: true, data: members });
  } catch (err) {
    next(err);
  }
}

export async function updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const member = await workspaceService.updateMemberRole(
      req.params['workspaceId']!,
      req.user!.id,
      req.params['userId']!,
      req.body,
    );
    res.status(200).json({ success: true, data: member });
  } catch (err) {
    next(err);
  }
}
